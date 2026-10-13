import "server-only";
import { prisma } from "@/lib/prisma";
import { elencaFederazioni } from "@/lib/federazioni";

// Story 26.1/26.2 (Epic 26, Tesseramento multi-Federazione): punto UNICO di
// accesso al Tesseramento. Decisione dell'epica: tutte le letture/scritture
// passano da qui (nessun prisma.tesseramento ne' federazioneIds altrove),
// cosi' un'eventuale futura migrazione da Tesseramento.federazioneIds
// (array) a una riga per federazione tocca solo questo modulo e la
// migrazione, non le pagine che leggono lo stato Tesseramento.
// Invariante: una riga Tesseramento esiste solo con federazioneIds non
// vuoto - svuotare l'array elimina la riga, cosi' "esiste un Tesseramento"
// continua a significare "tesserata" come prima dell'Epic 26.

export type FederazioneMinima = { id: string; attiva: boolean };

export type ModificaTesseramento = { atletaId: string; federazioni: string[] };

type Operazione =
  | { atletaId: string; tipo: "scrivi"; federazioneIds: string[] }
  | { atletaId: string; tipo: "elimina" };

export type EsitoValidazione =
  | { ok: true; operazioni: Operazione[] }
  | { ok: false; motivo: "federazione_non_valida"; atletaIds: string[] }
  | { ok: false; motivo: "conferma_richiesta"; atletaIds: string[] };

export type EsitoSalvataggio =
  | { ok: true }
  | Exclude<EsitoValidazione, { ok: true }>;

// Usata da eliminaFederazioneAction (Story 26.1): una Federazione presente
// in un qualunque Tesseramento, di qualunque stagione, non si elimina.
export async function federazioneInUso(id: string): Promise<boolean> {
  const conteggio = await prisma.tesseramento.count({
    where: { federazioneIds: { has: id } },
  });
  return conteggio > 0;
}

// atletaId -> id delle Federazioni con cui e' tesserata nella stagione.
export async function federazioniPerAtleta(
  annoAgonisticoId: string
): Promise<Map<string, string[]>> {
  const righe = await prisma.tesseramento.findMany({
    where: { annoAgonisticoId },
    select: { atletaId: true, federazioneIds: true },
  });
  return new Map(righe.map((r) => [r.atletaId, r.federazioneIds]));
}

// atletaId -> etichette (sigla, o nome se manca) nell'ordine configurato
// delle Federazioni - per i badge di /app/gruppi e /app/i-miei-gruppi.
// Un id senza Federazione corrispondente (non dovrebbe esistere: eliminare
// una Federazione in uso e' bloccato) viene ignorato.
export async function etichetteTesseramentoPerAtleta(
  annoAgonisticoId: string
): Promise<Map<string, string[]>> {
  const [perAtleta, federazioni] = await Promise.all([
    federazioniPerAtleta(annoAgonisticoId),
    elencaFederazioni(),
  ]);
  const risultato = new Map<string, string[]>();
  for (const [atletaId, ids] of perAtleta) {
    const presenti = new Set(ids);
    const etichette = federazioni
      .filter((f) => presenti.has(f.id))
      .map((f) => f.sigla ?? f.nome);
    if (etichette.length > 0) risultato.set(atletaId, etichette);
  }
  return risultato;
}

export type ColonnaTesseramento = {
  id: string;
  etichetta: string;
  nome: string;
  attiva: boolean;
};

// Colonne di /app/conferma-tesseramenti (Story 26.2): Federazioni attive +
// le disattivate ancora presenti in qualche Tesseramento della stagione (si
// possono togliere, non aggiungere), nell'ordine configurato. Senza la
// colonna di una disattivata usata, modificare un'altra federazione della
// stessa Atleta ne cancellerebbe in silenzio quella disattivata.
export function colonneTesseramento(
  federazioni: { id: string; nome: string; sigla: string | null; attiva: boolean }[],
  tesseramenti: Map<string, string[]>
): ColonnaTesseramento[] {
  const usati = new Set([...tesseramenti.values()].flat());
  return federazioni
    .filter((f) => f.attiva || usati.has(f.id))
    .map((f) => ({ id: f.id, etichetta: f.sigla ?? f.nome, nome: f.nome, attiva: f.attiva }));
}

// Regole pure di Story 26.2 (testate senza DB):
// - un id inesistente e' sempre rifiutato;
// - una Federazione disattivata e' accettata solo se gia' presente
//   nell'array attuale dell'Atleta (si puo' togliere, non aggiungere);
// - svuotare un Tesseramento esistente richiede consentiSvuotamento;
// - lasciare vuota una riga mai tesserata non produce alcuna scrittura.
// Gli id vengono deduplicati e ordinati come l'elenco Federazioni.
export function validaModificheTesseramento(
  modifiche: ModificaTesseramento[],
  attuali: Map<string, string[]>,
  federazioni: FederazioneMinima[],
  consentiSvuotamento: boolean
): EsitoValidazione {
  const indice = new Map(federazioni.map((f, i) => [f.id, i]));
  const attivaPerId = new Map(federazioni.map((f) => [f.id, f.attiva]));
  const nonValide: string[] = [];
  const daSvuotare: string[] = [];
  const operazioni: Operazione[] = [];

  for (const { atletaId, federazioni: richieste } of modifiche) {
    const attualiAtleta = new Set(attuali.get(atletaId) ?? []);
    const ids = [...new Set(richieste)];
    const valida = ids.every(
      (id) => attivaPerId.has(id) && (attivaPerId.get(id) || attualiAtleta.has(id))
    );
    if (!valida) {
      nonValide.push(atletaId);
      continue;
    }
    if (ids.length === 0) {
      if (attualiAtleta.size === 0) continue;
      if (!consentiSvuotamento) daSvuotare.push(atletaId);
      operazioni.push({ atletaId, tipo: "elimina" });
      continue;
    }
    ids.sort((a, b) => indice.get(a)! - indice.get(b)!);
    operazioni.push({ atletaId, tipo: "scrivi", federazioneIds: ids });
  }

  if (nonValide.length > 0) {
    return { ok: false, motivo: "federazione_non_valida", atletaIds: nonValide };
  }
  if (daSvuotare.length > 0) {
    return { ok: false, motivo: "conferma_richiesta", atletaIds: daSvuotare };
  }
  return { ok: true, operazioni };
}

// Salvataggio di Story 26.2: legge stato attuale e Federazioni, valida, poi
// scrive tutto in un'unica $transaction ad array (tutto-o-niente) - stesso
// tipo di transazione gia' usato nel resto del progetto, nessuna
// transazione interattiva (mai collaudata con l'adapter pg/pooler).
export async function salvaModificheTesseramento(
  annoAgonisticoId: string,
  modifiche: ModificaTesseramento[],
  { consentiSvuotamento }: { consentiSvuotamento: boolean }
): Promise<EsitoSalvataggio> {
  const [federazioni, righe] = await Promise.all([
    elencaFederazioni(),
    prisma.tesseramento.findMany({
      where: { annoAgonisticoId, atletaId: { in: modifiche.map((m) => m.atletaId) } },
      select: { atletaId: true, federazioneIds: true },
    }),
  ]);
  const attuali = new Map(righe.map((r) => [r.atletaId, r.federazioneIds]));

  const esito = validaModificheTesseramento(
    modifiche,
    attuali,
    federazioni,
    consentiSvuotamento
  );
  if (!esito.ok) return esito;
  if (esito.operazioni.length === 0) return { ok: true };

  await prisma.$transaction(
    esito.operazioni.map((op) =>
      op.tipo === "elimina"
        ? prisma.tesseramento.deleteMany({
            where: { atletaId: op.atletaId, annoAgonisticoId },
          })
        : prisma.tesseramento.upsert({
            where: {
              atletaId_annoAgonisticoId: { atletaId: op.atletaId, annoAgonisticoId },
            },
            create: { atletaId: op.atletaId, annoAgonisticoId, federazioneIds: op.federazioneIds },
            update: { federazioneIds: op.federazioneIds },
          })
    )
  );
  return { ok: true };
}

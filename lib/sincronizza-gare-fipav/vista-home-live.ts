import { oraInMinuti } from "@/lib/raggruppa-per-settimana";
import type { LetturaLiveFipav } from "./leggi-live-fipav";

// Story 18.33 (review fix): estratta da app/page.tsx - la logica di
// filtro/formazione delle due sezioni era inline nel Server Component,
// quindi non testabile (nessuna infrastruttura di test per il rendering di
// Server Component in questo progetto, gia' un limite noto/accettato per
// altre pagine). A differenza di quel caso (puro rendering condizionale),
// qui e' logica pura di trasformazione dati (filtro per data, formazione
// delle righe) - genuinamente estraibile, quindi estratta invece di
// accettare un gap del Matrix Test Audit.

export type CampionatoConLinkFipav = {
  id: string;
  nome: string;
  colore: string | null;
  gruppo: { nome: string };
};

export type LetturaPerCampionato = {
  campionato: CampionatoConLinkFipav;
  lettura: LetturaLiveFipav | null;
};

export type RisultatoSettimanaScorsa = {
  chiave: string;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  risultato: string | null;
  // Review fix (Blind Hunter): senza questo campo, una gara non ancora
  // giocata (risultato nullo) e una gara rinviata/sospesa mostravano lo
  // stesso identico testo generico "Risultato non disponibile" - qui il
  // dato e' gia' letto dal parser (RigaGaraImportata.statoDescrizione, es.
  // "gara omologata"/"da disputare"), solo mai passato alla vista prima.
  statoDescrizione: string | null;
  campionatoNome: string;
  campionatoColore: string | null;
};

// AC #1/#2 (spec-18-33): elenco unico appiattito su tutti i Campionati,
// filtrato ai soli risultati la cui data cade nella settimana precedente
// (confini passati dal chiamante, stessa aritmetica gia' in uso per la
// settimana corrente in app/page.tsx), ordinato per data poi per ora
// (oraInMinuti, gestisce anche orari non zero-paddati - stesso principio
// gia' in uso per "Partite della settimana"). Un Campionato con lettura
// fallita (null) o senza gare nel range non contribuisce alcuna riga.
export function risultatiSettimanaScorsaDaLetture(
  letturePerCampionato: LetturaPerCampionato[],
  lunediPrecedenteIso: string,
  domenicaPrecedenteIso: string
): RisultatoSettimanaScorsa[] {
  return letturePerCampionato
    .flatMap(({ campionato, lettura }) =>
      (lettura?.risultati ?? [])
        .filter(
          (riga) => riga.data >= lunediPrecedenteIso && riga.data <= domenicaPrecedenteIso
        )
        .map((riga, indice) => ({
          // Review fix (Edge Case Hunter): l'indice e' incluso nella chiave
          // React - due gare con lo stesso garaNumero per lo stesso
          // Campionato (rinviata/recuperata, o un errore del portale) non
          // producevano piu' una chiave univoca, con un possibile
          // disallineamento/scomparsa silenziosa di una riga in React.
          chiave: `${campionato.id}-${riga.garaNumero}-${indice}`,
          data: riga.data,
          ora: riga.ora,
          squadraCasa: riga.squadraCasa,
          squadraOspite: riga.squadraOspite,
          risultato: riga.risultato,
          statoDescrizione: riga.statoDescrizione,
          campionatoNome: campionato.nome,
          campionatoColore: campionato.colore,
        }))
    )
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return oraInMinuti(a.ora) - oraInMinuti(b.ora);
    });
}

export type ClassificaVista = {
  campionatoId: string;
  campionatoNome: string;
  campionatoColore: string | null;
  gruppoNome: string;
  righe: LetturaLiveFipav["classifica"];
  // Story 18.36: nome della nostra squadra come compare nei risultati
  // (nostraSquadraDaRisultati), null se non determinabile in modo univoco.
  nostraSquadra: string | null;
};

// Story 18.36: il link FIPAV di un Campionato contiene l'id del club, quindi
// lettura.risultati elenca solo le gare della nostra squadra (epics.md Story
// 10.11). La nostra squadra e' l'unico nome presente in TUTTE le gare
// (squadraCasa o squadraOspite), confronto trim + case-insensitive con
// spazi interni/NBSP collassati (chiaveSquadra). Zero
// gare, oppure piu' nomi comuni a tutte (es. una sola gara: entrambe le
// squadre) -> nome non univoco -> null. Restituisce il nome come scritto
// nella prima gara (trim). Nessun campo DB ne' configurazione: dedotto dai
// dati letti.
export function nostraSquadraDaRisultati(
  risultati: Pick<LetturaLiveFipav["risultati"][number], "squadraCasa" | "squadraOspite">[]
): string | null {
  if (risultati.length === 0) return null;

  const nomiGara = (gara: (typeof risultati)[number]) =>
    new Set(
      [chiaveSquadra(gara.squadraCasa), chiaveSquadra(gara.squadraOspite)].filter(
        (n) => n.length > 0
      )
    );

  let comuni = nomiGara(risultati[0]);
  for (const gara of risultati.slice(1)) {
    const nomi = nomiGara(gara);
    comuni = new Set([...comuni].filter((n) => nomi.has(n)));
    if (comuni.size === 0) return null;
  }
  if (comuni.size !== 1) return null;

  const [unico] = comuni;
  const prima = risultati[0];
  return chiaveSquadra(prima.squadraCasa) === unico
    ? prima.squadraCasa.trim()
    : prima.squadraOspite.trim();
}

// Story 18.36: confronto usato da /classifiche per distinguere la riga della
// nostra squadra (stessa normalizzazione di nostraSquadraDaRisultati). Se il
// nome non compare in classifica nessuna riga risulta distinta.
export function eNostraSquadra(squadra: string, nostraSquadra: string | null): boolean {
  if (!nostraSquadra) return false;
  return chiaveSquadra(squadra) === chiaveSquadra(nostraSquadra);
}

// Trim, spazi interni collassati e minuscolo. \s comprende anche NBSP (un
// nome copiato dall'HTML del portale puo' contenerne).
function chiaveSquadra(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().toLowerCase();
}

// AC #3/#4/#5 (spec-18-33): una classifica per Campionato, solo per chi ha una
// lettura riuscita CON almeno una riga di classifica - un Campionato con
// lettura fallita (null) o una classifica vuota (girone appena creato, caso
// limite non coperto dalla matrice I/O ma comunque fail-soft per coerenza
// con le altre sezioni) non genera alcuna classifica, mai una classifica vuota.
export function classifichePerCampionatoDaLetture(
  letturePerCampionato: LetturaPerCampionato[]
): ClassificaVista[] {
  return letturePerCampionato
    .filter(
      (l): l is LetturaPerCampionato & { lettura: LetturaLiveFipav } =>
        !!l.lettura && l.lettura.classifica.length > 0
    )
    .map(({ campionato, lettura }) => ({
      campionatoId: campionato.id,
      campionatoNome: campionato.nome,
      campionatoColore: campionato.colore,
      gruppoNome: campionato.gruppo.nome,
      righe: lettura.classifica,
      nostraSquadra: nostraSquadraDaRisultati(lettura.risultati),
    }));
}

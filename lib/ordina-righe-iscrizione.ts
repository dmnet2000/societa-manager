// Story 9.46: ordinamento a click sulle intestazioni della tabella Atlete in
// /app/conferma-iscrizioni (IscrizioniElenco.tsx) - mirror strutturale di
// ordina-incontri-tabella.ts (Story 20.24): funzione pura, testata, nessuna
// richiesta server-side. Un criterio alla volta; spareggio sempre per nome,
// poi codice fiscale, poi id (ordine deterministico anche fra omonimi).

export type ColonnaOrdinamentoIscrizioni = "nome" | "gruppo" | "stato";

export type DirezioneOrdinamentoIscrizioni = "asc" | "desc";

export type OrdinamentoIscrizioni = {
  colonna: ColonnaOrdinamentoIscrizioni;
  direzione: DirezioneOrdinamentoIscrizioni;
};

// Forma minima di una riga ordinabile - compatibile con RigaIscrizione
// (IscrizioniElenco.tsx): iscritta <=> iscrizioneId !== null.
type RigaOrdinabile = {
  atleta: { id: string; nome: string; codiceFiscale: string };
  iscrizioneId: string | null;
  gruppi: string[];
};

// Stessa colonna gia' attiva -> toggle della direzione; nessun ordinamento o
// colonna diversa -> nuova colonna, crescente (stessa regola di Story 20.24).
export function prossimoOrdinamentoIscrizioni(
  attuale: OrdinamentoIscrizioni | null,
  colonna: ColonnaOrdinamentoIscrizioni
): OrdinamentoIscrizioni {
  if (attuale?.colonna === colonna) {
    return { colonna, direzione: attuale.direzione === "asc" ? "desc" : "asc" };
  }
  return { colonna, direzione: "asc" };
}

// Alfabetico italiano, senza distinzione di maiuscole/accenti come criterio
// primario, numeri confrontati per valore ("U8" < "U10" < "U14").
function confrontaTesto(a: string, b: string): number {
  return a.localeCompare(b, "it", { sensitivity: "base", numeric: true });
}

function confrontaNome(a: RigaOrdinabile, b: RigaOrdinabile): number {
  return confrontaTesto(a.atleta.nome, b.atleta.nome);
}

// Spareggio finale deterministico (omonimi): codice fiscale, poi id.
function confrontaSpareggio(a: RigaOrdinabile, b: RigaOrdinabile): number {
  const diffCf = a.atleta.codiceFiscale.localeCompare(b.atleta.codiceFiscale);
  if (diffCf !== 0) return diffCf;
  return a.atleta.id < b.atleta.id ? -1 : a.atleta.id > b.atleta.id ? 1 : 0;
}

// Gruppi normalizzati per il confronto: nomi vuoti/di soli spazi ignorati,
// ordinati qui con lo stesso comparatore (non si assume l'ordine della pagina).
function gruppiOrdinati(riga: RigaOrdinabile): string[] {
  return riga.gruppi
    .map((g) => g.trim())
    .filter((g) => g !== "")
    .sort(confrontaTesto);
}

// Confronto lessicografico elemento per elemento delle liste di Gruppi; a
// parita' di prefisso la lista piu' corta viene prima. Un'Atleta senza Gruppo
// resta SEMPRE in fondo, sia in crescente sia in decrescente.
function confrontaGruppi(ga: string[], gb: string[], segno: number): number {
  if (ga.length === 0 && gb.length === 0) return 0;
  if (ga.length === 0) return 1;
  if (gb.length === 0) return -1;
  const n = Math.min(ga.length, gb.length);
  for (let i = 0; i < n; i++) {
    const diff = confrontaTesto(ga[i], gb[i]);
    if (diff !== 0) return segno * diff;
  }
  return segno * (ga.length - gb.length);
}

// Stato: crescente = "Non iscritta" prima (da confermare in cima),
// decrescente = "Iscritta" prima.
function confrontaStato(a: RigaOrdinabile, b: RigaOrdinabile, segno: number): number {
  const ia = a.iscrizioneId !== null ? 1 : 0;
  const ib = b.iscrizioneId !== null ? 1 : 0;
  return segno * (ia - ib);
}

export function ordinaRigheIscrizione<T extends RigaOrdinabile>(
  righe: T[],
  colonna: ColonnaOrdinamentoIscrizioni,
  direzione: DirezioneOrdinamentoIscrizioni
): T[] {
  const segno = direzione === "asc" ? 1 : -1;
  const gruppiPerRiga = new Map<T, string[]>();
  if (colonna === "gruppo") {
    for (const riga of righe) gruppiPerRiga.set(riga, gruppiOrdinati(riga));
  }

  return [...righe].sort((a, b) => {
    switch (colonna) {
      case "nome":
        return segno * (confrontaNome(a, b) || confrontaSpareggio(a, b));
      case "gruppo":
        return (
          confrontaGruppi(gruppiPerRiga.get(a)!, gruppiPerRiga.get(b)!, segno) ||
          confrontaNome(a, b) ||
          confrontaSpareggio(a, b)
        );
      case "stato":
        return confrontaStato(a, b, segno) || confrontaNome(a, b) || confrontaSpareggio(a, b);
      default: {
        const mai: never = colonna;
        throw new Error(`Colonna di ordinamento non gestita: ${String(mai)}`);
      }
    }
  });
}

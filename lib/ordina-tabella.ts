// Ordinamento generico a click sulle intestazioni, condiviso da tutte le
// tabelle dell'app che passano per TabellaOrdinabile (app/TabellaOrdinabile.tsx).
// Funzione pura, testata - stessa regola delle tabelle con ordinamento
// dedicato (ordina-righe-iscrizione.ts, ordina-incontri-tabella.ts): primo
// clic su una colonna = crescente, clic successivo sulla stessa = inverte.
//
// Ogni riga porta un valore di ordinamento per colonna, calcolato dalla
// pagina (mai estratto dal testo mostrato): date in ISO, numeri come number,
// giorni della settimana come indice - cosi' l'ordine e' quello naturale e
// non alfabetico. Un valore mancante (null/undefined/stringa vuota) resta
// SEMPRE in fondo, sia in crescente sia in decrescente.

export type ValoreOrdinamento = string | number | null | undefined;

export type DirezioneOrdinamento = "asc" | "desc";

export type OrdinamentoTabella = {
  colonna: number;
  direzione: DirezioneOrdinamento;
};

export function prossimoOrdinamentoTabella(
  attuale: OrdinamentoTabella | null,
  colonna: number
): OrdinamentoTabella {
  if (attuale?.colonna === colonna) {
    return { colonna, direzione: attuale.direzione === "asc" ? "desc" : "asc" };
  }
  return { colonna, direzione: "asc" };
}

function mancante(valore: ValoreOrdinamento): valore is null | undefined | "" {
  return valore === null || valore === undefined || valore === "";
}

// Numeri per valore; testo alfabetico italiano senza distinzione di
// maiuscole/accenti, con le cifre confrontate per valore ("U8" < "U10").
// Un confronto misto numero/testo (mai atteso nella stessa colonna) ricade
// sul confronto testuale.
export function confrontaValoriOrdinamento(
  a: string | number,
  b: string | number
): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "it", {
    sensitivity: "base",
    numeric: true,
  });
}

// A parita' di valore resta l'ordine originale della pagina (sort stabile).
export function ordinaRigheTabella<T extends { valori: ValoreOrdinamento[] }>(
  righe: T[],
  ordinamento: OrdinamentoTabella | null
): T[] {
  if (!ordinamento) return righe;
  const { colonna, direzione } = ordinamento;
  const segno = direzione === "asc" ? 1 : -1;

  return [...righe].sort((x, y) => {
    const a = x.valori[colonna];
    const b = y.valori[colonna];
    const aMancante = mancante(a);
    const bMancante = mancante(b);
    if (aMancante && bMancante) return 0;
    if (aMancante) return 1;
    if (bMancante) return -1;
    return segno * confrontaValoriOrdinamento(a, b);
  });
}

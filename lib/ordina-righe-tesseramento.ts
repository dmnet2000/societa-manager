// Ordinamento a click sulle intestazioni della matrice Atlete x Federazioni in
// /app/conferma-tesseramenti (ConfermaTesseramentiForm.tsx) - mirror di
// ordina-righe-iscrizione.ts (Story 9.46): funzione pura, nessuna richiesta
// server-side, un criterio alla volta, spareggio per nome, poi codice
// fiscale, poi id (ordine deterministico anche fra omonimi).

// Colonna federazione = "federazione:<id Federazione>".
export type ColonnaOrdinamentoTesseramenti = "nome" | "stato" | `federazione:${string}`;

export type DirezioneOrdinamentoTesseramenti = "asc" | "desc";

export type OrdinamentoTesseramenti = {
  colonna: ColonnaOrdinamentoTesseramenti;
  direzione: DirezioneOrdinamentoTesseramenti;
};

// Forma minima di una riga ordinabile - compatibile con
// AtletaTesseramentoRiga (ConfermaTesseramentiForm.tsx).
type RigaOrdinabile = {
  id: string;
  nome: string;
  codiceFiscale: string;
  iscrizioneAttiva: boolean;
  federazioniIniziali: string[];
};

// Stessa colonna gia' attiva -> toggle della direzione; colonna diversa ->
// nuova colonna, crescente (stessa regola di Story 9.46/20.24).
export function prossimoOrdinamentoTesseramenti(
  attuale: OrdinamentoTesseramenti,
  colonna: ColonnaOrdinamentoTesseramenti
): OrdinamentoTesseramenti {
  if (attuale.colonna === colonna) {
    return { colonna, direzione: attuale.direzione === "asc" ? "desc" : "asc" };
  }
  return { colonna, direzione: "asc" };
}

function confrontaNome(a: RigaOrdinabile, b: RigaOrdinabile): number {
  return a.nome.localeCompare(b.nome, "it", { sensitivity: "base", numeric: true });
}

function confrontaSpareggio(a: RigaOrdinabile, b: RigaOrdinabile): number {
  const diffCf = a.codiceFiscale.localeCompare(b.codiceFiscale);
  if (diffCf !== 0) return diffCf;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Booleani: crescente = false prima ("Non iscritta" / non tesserata in cima,
// cioe' le righe da sistemare), decrescente = true prima.
function confrontaFlag(a: boolean, b: boolean, segno: number): number {
  return segno * (Number(a) - Number(b));
}

// Le colonne federazione ordinano sullo stato SALVATO (federazioniIniziali),
// non sulle caselle spuntate in pagina: spuntare una casella non fa saltare
// la riga altrove. Dopo "Salva" i nuovi dati riordinano le righe.
export function ordinaRigheTesseramento<T extends RigaOrdinabile>(
  righe: T[],
  colonna: ColonnaOrdinamentoTesseramenti,
  direzione: DirezioneOrdinamentoTesseramenti
): T[] {
  const segno = direzione === "asc" ? 1 : -1;
  const federazioneId = colonna.startsWith("federazione:")
    ? colonna.slice("federazione:".length)
    : null;

  return [...righe].sort((a, b) => {
    if (colonna === "nome") return segno * (confrontaNome(a, b) || confrontaSpareggio(a, b));
    const primario =
      federazioneId !== null
        ? confrontaFlag(
            a.federazioniIniziali.includes(federazioneId),
            b.federazioniIniziali.includes(federazioneId),
            segno
          )
        : confrontaFlag(a.iscrizioneAttiva, b.iscrizioneAttiva, segno);
    return primario || confrontaNome(a, b) || confrontaSpareggio(a, b);
  });
}

export type Trend = "in-calo" | "costante" | "in-crescita";

export type StatistichePresenza = {
  percentuale: number;
  trend: Trend;
};

const SOGLIA_PUNTI_PERCENTUALI = 10;

// FR-10: percentuale di presenza + trend, calcolati puramente sullo storico
// gia' caricato da leggiStoricoPresenzePerAtleta (Story 3.2) - nessuna nuova
// query. Il trend confronta la percentuale della prima e della seconda meta'
// cronologica dello storico; una differenza entro la soglia (10 punti,
// confine stretto: ne' >= ne' <=) risulta "costante", per evitare che
// oscillazioni statisticamente irrilevanti vengano lette come un trend reale
// (scelta implementativa non specificata da FR-10/PRD, vedi Dev Notes Story 3.3).
export function calcolaStatistichePresenza(
  storico: { presente: boolean }[]
): StatistichePresenza | null {
  if (storico.length === 0) return null;

  const percentuale = Math.round(calcolaRapporto(storico) * 100);

  if (storico.length === 1) {
    return { percentuale, trend: "costante" };
  }

  const metaIndex = Math.floor(storico.length / 2);
  const primaMeta = storico.slice(0, metaIndex);
  const secondaMeta = storico.slice(metaIndex);
  // Confronto sul tasso esatto di ciascuna meta', non sulle percentuali gia'
  // arrotondate (review fix) - arrotondare ciascuna meta' prima di sottrarre
  // puo' far scendere sotto soglia una differenza che sul tasso reale la
  // supera (es. 72.73%->73 e 83.33%->83: diff arrotondata 10, non >10, ma
  // la differenza reale 10.61 lo sarebbe).
  const diffPunti =
    (calcolaRapporto(secondaMeta) - calcolaRapporto(primaMeta)) * 100;

  const trend: Trend =
    diffPunti > SOGLIA_PUNTI_PERCENTUALI
      ? "in-crescita"
      : diffPunti < -SOGLIA_PUNTI_PERCENTUALI
        ? "in-calo"
        : "costante";

  return { percentuale, trend };
}

function calcolaRapporto(righe: { presente: boolean }[]): number {
  return righe.filter((r) => r.presente).length / righe.length;
}

export const ETICHETTA_TREND: Record<Trend, string> = {
  "in-calo": "in calo",
  costante: "costante",
  "in-crescita": "in crescita",
};

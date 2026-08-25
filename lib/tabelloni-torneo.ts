// Story 20.6 (Epic 20, Torneo Memorial): estratta da
// app/app/(torneo)/torneo/[edizioneId]/[categoriaId]/tabellone/page.tsx (dove
// viveva come costante locale non esportata) - riusata anche dalla vetrina
// pubblica (app/torneo/page.tsx), che duplicava le stesse etichette prima di
// questo fix (review fix, Blind Hunter: le etichette utente-facing delle due
// pagine potevano andare fuori sincrono). Nessun import "server-only": dati
// statici, nessun IO.
export const TABELLONI_TORNEO = [
  {
    value: "POSIZIONI_1_4" as const,
    label: "Tabellone posizioni 1°-4°",
    etichettaVincenti: "Finale 1°/2° posto",
    etichettaPerdenti: "Finale 3°/4° posto",
  },
  {
    value: "POSIZIONI_5_8" as const,
    label: "Tabellone posizioni 5°-8°",
    etichettaVincenti: "Finale 5°/6° posto",
    etichettaPerdenti: "Finale 7°/8° posto",
  },
];

import { describe, expect, it } from "vitest";
import { calcolaProspettoIpoteticoTorneo, formatoSeiSquadre } from "./prospetto-ipotetico-torneo";

// Story 20.20 (Epic 20, Torneo Memorial): test della funzione pura, nessun
// mock necessario (nessun import "server-only" nel modulo testato). Copre
// la matrice I/O dello spec (4 scenari) piu' la verifica testuale esatta
// degli accoppiamenti per un caso formato 8 e uno formato 6.

describe("calcolaProspettoIpoteticoTorneo", () => {
  it("returns null when Girone counts are unbalanced (e.g. 4 vs 3)", () => {
    expect(calcolaProspettoIpoteticoTorneo(4, 3)).toBeNull();
  });

  it("returns null when both Gironi have the same count but it is not 3 or 4 (e.g. 2 vs 2)", () => {
    expect(calcolaProspettoIpoteticoTorneo(2, 2)).toBeNull();
  });

  it("returns null for other unrecognized balanced counts (e.g. 5 vs 5)", () => {
    expect(calcolaProspettoIpoteticoTorneo(5, 5)).toBeNull();
  });

  it("returns 2 sections for the 8-format (4+4): posizioni 1-4 and posizioni 5-8, each with 2 semifinali + 2 finali", () => {
    const result = calcolaProspettoIpoteticoTorneo(4, 4);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].semifinali).toHaveLength(2);
    expect(result![0].finali).toHaveLength(2);
    expect(result![1].semifinali).toHaveLength(2);
    expect(result![1].finali).toHaveLength(2);
  });

  it("returns the exact placeholder pairings for the 8-format (4+4), mirroring generaTabelloneAction's crossing", () => {
    const result = calcolaProspettoIpoteticoTorneo(4, 4);

    expect(result).toEqual([
      {
        titolo: "Tabellone posizioni 1°-4°",
        semifinali: [
          {
            etichetta: "Semifinale 1",
            casa: "1° Girone A",
            ospite: "2° Girone B",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_1_4",
            ordinale: 1,
          },
          {
            etichetta: "Semifinale 2",
            casa: "1° Girone B",
            ospite: "2° Girone A",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_1_4",
            ordinale: 2,
          },
        ],
        finali: [
          {
            etichetta: "Finale 1°/2° posto",
            casa: "Vincente semifinale 1",
            ospite: "Vincente semifinale 2",
            fase: "FINALE_VINCENTI",
            tabellone: "POSIZIONI_1_4",
            ordinale: null,
          },
          {
            etichetta: "Finale 3°/4° posto",
            casa: "Perdente semifinale 1",
            ospite: "Perdente semifinale 2",
            fase: "FINALE_PERDENTI",
            tabellone: "POSIZIONI_1_4",
            ordinale: null,
          },
        ],
      },
      {
        titolo: "Tabellone posizioni 5°-8°",
        semifinali: [
          {
            etichetta: "Semifinale 1",
            casa: "3° Girone A",
            ospite: "4° Girone B",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_5_8",
            ordinale: 1,
          },
          {
            etichetta: "Semifinale 2",
            casa: "3° Girone B",
            ospite: "4° Girone A",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_5_8",
            ordinale: 2,
          },
        ],
        finali: [
          {
            etichetta: "Finale 5°/6° posto",
            casa: "Vincente semifinale 1",
            ospite: "Vincente semifinale 2",
            fase: "FINALE_VINCENTI",
            tabellone: "POSIZIONI_5_8",
            ordinale: null,
          },
          {
            etichetta: "Finale 7°/8° posto",
            casa: "Perdente semifinale 1",
            ospite: "Perdente semifinale 2",
            fase: "FINALE_PERDENTI",
            tabellone: "POSIZIONI_5_8",
            ordinale: null,
          },
        ],
      },
    ]);
  });

  it("returns 2 sections for the 6-format (3+3): posizioni 1-4 (2 semifinali + 2 finali) and a direct finalina 5-6 (no semifinale)", () => {
    const result = calcolaProspettoIpoteticoTorneo(3, 3);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].semifinali).toHaveLength(2);
    expect(result![0].finali).toHaveLength(2);
    expect(result![1].semifinali).toHaveLength(0);
    expect(result![1].finali).toHaveLength(1);
  });

  it("returns the exact placeholder pairings for the 6-format (3+3): posizioni 1-4 identical to the 8-format, finalina 5-6 is a single direct pairing between the two terze classificate", () => {
    const result = calcolaProspettoIpoteticoTorneo(3, 3);

    expect(result).toEqual([
      {
        titolo: "Tabellone posizioni 1°-4°",
        semifinali: [
          {
            etichetta: "Semifinale 1",
            casa: "1° Girone A",
            ospite: "2° Girone B",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_1_4",
            ordinale: 1,
          },
          {
            etichetta: "Semifinale 2",
            casa: "1° Girone B",
            ospite: "2° Girone A",
            fase: "SEMIFINALE",
            tabellone: "POSIZIONI_1_4",
            ordinale: 2,
          },
        ],
        finali: [
          {
            etichetta: "Finale 1°/2° posto",
            casa: "Vincente semifinale 1",
            ospite: "Vincente semifinale 2",
            fase: "FINALE_VINCENTI",
            tabellone: "POSIZIONI_1_4",
            ordinale: null,
          },
          {
            etichetta: "Finale 3°/4° posto",
            casa: "Perdente semifinale 1",
            ospite: "Perdente semifinale 2",
            fase: "FINALE_PERDENTI",
            tabellone: "POSIZIONI_1_4",
            ordinale: null,
          },
        ],
      },
      {
        titolo: "Finalina 5°/6° posto",
        semifinali: [],
        finali: [
          {
            etichetta: "Finalina 5°/6° posto",
            casa: "3° Girone A",
            ospite: "3° Girone B",
            fase: "FINALE_VINCENTI",
            tabellone: "POSIZIONI_5_8",
            ordinale: null,
          },
        ],
      },
    ]);
  });

  // spec-20-26 (Epic 20, Torneo Memorial): da quando generaTabelloneAction
  // genera davvero la finalina diretta del formato 6 (fase
  // "FINALE_VINCENTI", tabellone "POSIZIONI_5_8"), questa riga porta gli
  // stessi metadati di ogni altra riga con un percorso di generazione reale
  // - stesso meccanismo di prenotazione anticipata gia' usato per le altre
  // righe (mirror del test precedente per il formato 8). Prima di
  // spec-20-26 questi campi erano tutti undefined (spec-20-21).
  it("attaches fase/tabellone/ordinale metadata to the direct finalina of the 6-format (spec-20-26)", () => {
    const result = calcolaProspettoIpoteticoTorneo(3, 3);

    expect(result![1].finali[0].fase).toBe("FINALE_VINCENTI");
    expect(result![1].finali[0].tabellone).toBe("POSIZIONI_5_8");
    expect(result![1].finali[0].ordinale).toBeNull();
  });
});

// spec-20-26 (Epic 20, Torneo Memorial): formatoSeiSquadre e' ora esportata
// e riusata direttamente da generaTabelloneAction/prenotaSlotIpoteticoAction
// (app/app/(torneo)/torneo/actions.ts) - mirror dei test gia' esistenti per
// formatoOttoSquadre altrove nel progetto.
describe("formatoSeiSquadre", () => {
  it("returns true only when both Gironi have exactly 3 Squadre", () => {
    expect(formatoSeiSquadre(3, 3)).toBe(true);
  });

  it("returns false for any other combination (unbalanced, or balanced but not 3)", () => {
    expect(formatoSeiSquadre(4, 4)).toBe(false);
    expect(formatoSeiSquadre(3, 4)).toBe(false);
    expect(formatoSeiSquadre(4, 3)).toBe(false);
    expect(formatoSeiSquadre(2, 2)).toBe(false);
  });
});

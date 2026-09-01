import { describe, expect, it } from "vitest";
import { etichettaFasePartitaTorneo } from "./etichetta-fase-partita-torneo";

describe("etichettaFasePartitaTorneo", () => {
  it("returns the Girone label for a GIRONE match, derived from squadraCasa.girone", () => {
    expect(
      etichettaFasePartitaTorneo({
        fase: "GIRONE",
        tabellone: null,
        squadraCasa: { girone: "GIRONE_A" },
      })
    ).toBe("Girone A");

    expect(
      etichettaFasePartitaTorneo({
        fase: "GIRONE",
        tabellone: null,
        squadraCasa: { girone: "GIRONE_B" },
      })
    ).toBe("Girone B");
  });

  it("labels a SEMIFINALE match with its Tabellone", () => {
    expect(
      etichettaFasePartitaTorneo({
        fase: "SEMIFINALE",
        tabellone: "POSIZIONI_1_4",
        squadraCasa: { girone: "GIRONE_A" },
      })
    ).toBe("Semifinale (Tabellone posizioni 1°-4°)");
  });

  it("labels FINALE_VINCENTI/FINALE_PERDENTI using the Tabellone's own etichette", () => {
    expect(
      etichettaFasePartitaTorneo({
        fase: "FINALE_VINCENTI",
        tabellone: "POSIZIONI_1_4",
        squadraCasa: { girone: "GIRONE_A" },
      })
    ).toBe("Finale 1°/2° posto");

    expect(
      etichettaFasePartitaTorneo({
        fase: "FINALE_PERDENTI",
        tabellone: "POSIZIONI_5_8",
        squadraCasa: { girone: "GIRONE_B" },
      })
    ).toBe("Finale 7°/8° posto");
  });

  it("falls back to a generic label if tabellone is null on a non-Girone match (defensive, not reachable in practice)", () => {
    expect(
      etichettaFasePartitaTorneo({
        fase: "SEMIFINALE",
        tabellone: null,
        squadraCasa: { girone: "GIRONE_A" },
      })
    ).toBe("Semifinale");

    expect(
      etichettaFasePartitaTorneo({
        fase: "FINALE_VINCENTI",
        tabellone: null,
        squadraCasa: { girone: "GIRONE_A" },
      })
    ).toBe("Finale");
  });
});

import { describe, expect, it } from "vitest";
import { SETTIMANE_TORNEO, ETICHETTA_SETTIMANA, isSettimanaTorneoValida } from "./settimana-torneo";

describe("SETTIMANE_TORNEO", () => {
  it("contains exactly le 2 settimane del torneo, in ordine", () => {
    expect(SETTIMANE_TORNEO.map((s) => s.value)).toEqual(["SETTIMANA_1", "SETTIMANA_2"]);
  });
});

describe("ETICHETTA_SETTIMANA", () => {
  it("ha un'etichetta in italiano per ciascuna settimana", () => {
    expect(ETICHETTA_SETTIMANA.SETTIMANA_1).toBe("Settimana 1");
    expect(ETICHETTA_SETTIMANA.SETTIMANA_2).toBe("Settimana 2");
  });
});

describe("isSettimanaTorneoValida", () => {
  it("returns true for a valid SettimanaTorneo value", () => {
    expect(isSettimanaTorneoValida("SETTIMANA_1")).toBe(true);
    expect(isSettimanaTorneoValida("SETTIMANA_2")).toBe(true);
  });

  it("returns false for an invalid or empty value", () => {
    expect(isSettimanaTorneoValida("")).toBe(false);
    expect(isSettimanaTorneoValida("SETTIMANA_3")).toBe(false);
    expect(isSettimanaTorneoValida("settimana_1")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  SETTIMANE_TORNEO,
  ETICHETTA_SETTIMANA,
  isSettimanaTorneoValida,
  etichettaSettimanaPersonalizzata,
} from "./settimana-torneo";

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

describe("etichettaSettimanaPersonalizzata", () => {
  it("returns the custom nomeSettimana1 when set for SETTIMANA_1", () => {
    const edizione = { nomeSettimana1: "Under 14/16", nomeSettimana2: null };
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_1", edizione)).toBe("Under 14/16");
  });

  it("returns the custom nomeSettimana2 when set for SETTIMANA_2", () => {
    const edizione = { nomeSettimana1: null, nomeSettimana2: "Under 18/Senior" };
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_2", edizione)).toBe("Under 18/Senior");
  });

  it("falls back to ETICHETTA_SETTIMANA when the field is null", () => {
    const edizione = { nomeSettimana1: null, nomeSettimana2: null };
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_1", edizione)).toBe("Settimana 1");
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_2", edizione)).toBe("Settimana 2");
  });

  it("falls back to ETICHETTA_SETTIMANA when the field is empty or only whitespace", () => {
    const edizione = { nomeSettimana1: "", nomeSettimana2: "   " };
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_1", edizione)).toBe("Settimana 1");
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_2", edizione)).toBe("Settimana 2");
  });

  it("trims surrounding whitespace from a custom name", () => {
    const edizione = { nomeSettimana1: "  Under 14/16  ", nomeSettimana2: null };
    expect(etichettaSettimanaPersonalizzata("SETTIMANA_1", edizione)).toBe("Under 14/16");
  });
});

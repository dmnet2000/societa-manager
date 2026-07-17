import { describe, expect, it } from "vitest";
import {
  GIORNI_SETTIMANA,
  ETICHETTA_GIORNO,
  isGiornoSettimanaValido,
} from "./giorno-settimana";

describe("GIORNI_SETTIMANA", () => {
  it("contains exactly the 7 giorni della settimana in ordine", () => {
    expect(GIORNI_SETTIMANA.map((g) => g.value)).toEqual([
      "LUNEDI",
      "MARTEDI",
      "MERCOLEDI",
      "GIOVEDI",
      "VENERDI",
      "SABATO",
      "DOMENICA",
    ]);
  });
});

describe("ETICHETTA_GIORNO", () => {
  it("ha un'etichetta in italiano per ciascun giorno", () => {
    expect(ETICHETTA_GIORNO.LUNEDI).toBe("Lunedì");
    expect(ETICHETTA_GIORNO.DOMENICA).toBe("Domenica");
  });
});

describe("isGiornoSettimanaValido", () => {
  it("returns true for a valid GiornoSettimana value", () => {
    expect(isGiornoSettimanaValido("MERCOLEDI")).toBe(true);
  });

  it("returns false for an invalid or empty value", () => {
    expect(isGiornoSettimanaValido("")).toBe(false);
    expect(isGiornoSettimanaValido("NON_UN_GIORNO")).toBe(false);
    expect(isGiornoSettimanaValido("lunedi")).toBe(false);
  });
});

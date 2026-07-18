import { describe, expect, it } from "vitest";
import {
  GIORNI_SETTIMANA,
  ETICHETTA_GIORNO,
  isGiornoSettimanaValido,
  giornoSettimanaDaData,
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

describe("giornoSettimanaDaData", () => {
  it("riconosce un Lunedi", () => {
    expect(giornoSettimanaDaData("2026-07-13")).toBe("LUNEDI");
  });

  it("riconosce una Domenica (confine di fine settimana)", () => {
    expect(giornoSettimanaDaData("2026-07-19")).toBe("DOMENICA");
  });

  it("usa il calendario UTC, non il fuso orario locale del processo", () => {
    // "2026-07-13" senza componente orario e' interpretata come UTC
    // mezzanotte (specifiche ECMAScript) - getUTCDay(), non getDay(), evita
    // lo scivolamento di un giorno gia' incontrato con AnnoAgonistico
    // (Story 1.6) in fusi orari negativi rispetto a UTC.
    expect(giornoSettimanaDaData("2026-07-16")).toBe("GIOVEDI");
  });
});

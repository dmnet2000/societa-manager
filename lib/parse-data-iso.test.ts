import { describe, expect, it } from "vitest";
import { parseDataIsoValida } from "./parse-data-iso";

describe("parseDataIsoValida", () => {
  it("accetta una data valida in formato YYYY-MM-DD", () => {
    const risultato = parseDataIsoValida("2026-08-01");
    expect(risultato).toEqual(new Date("2026-08-01T00:00:00.000Z"));
  });

  it("rifiuta una data calendarialmente inesistente (30 febbraio)", () => {
    expect(parseDataIsoValida("2026-02-30")).toBeNull();
  });

  it("rifiuta una stringa non parsabile", () => {
    expect(parseDataIsoValida("non-una-data")).toBeNull();
  });

  it("rifiuta un formato diverso da YYYY-MM-DD (es. un datetime ISO completo)", () => {
    expect(parseDataIsoValida("2026-08-01T10:00:00.000Z")).toBeNull();
  });

  it("rifiuta una stringa vuota", () => {
    expect(parseDataIsoValida("")).toBeNull();
  });

  it("accetta un anno bisestile (29 febbraio)", () => {
    const risultato = parseDataIsoValida("2028-02-29");
    expect(risultato).toEqual(new Date("2028-02-29T00:00:00.000Z"));
  });

  it("rifiuta il 29 febbraio in un anno non bisestile", () => {
    expect(parseDataIsoValida("2026-02-29")).toBeNull();
  });
});

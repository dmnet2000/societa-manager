import { describe, expect, it } from "vitest";
import { parseDataItaliana } from "./data-italiana";

describe("parseDataItaliana", () => {
  it("analizza una data valida in formato gg/mm/aaaa", () => {
    const risultato = parseDataItaliana("01/05/2010");
    expect(risultato).toEqual(new Date(Date.UTC(2010, 4, 1)));
  });

  it("restituisce null per null/undefined", () => {
    expect(parseDataItaliana(null)).toBeNull();
    expect(parseDataItaliana(undefined)).toBeNull();
  });

  it("restituisce null per una stringa vuota o solo spazi", () => {
    expect(parseDataItaliana("")).toBeNull();
    expect(parseDataItaliana("   ")).toBeNull();
  });

  it("restituisce null per un formato non riconosciuto", () => {
    expect(parseDataItaliana("2010-05-01")).toBeNull();
    expect(parseDataItaliana("non una data")).toBeNull();
  });

  it("restituisce null per una data inesistente (rollover, es. 31/02)", () => {
    expect(parseDataItaliana("31/02/2010")).toBeNull();
  });

  it("restituisce la Date invariata se già un oggetto Date", () => {
    const data = new Date(Date.UTC(2010, 4, 1));
    expect(parseDataItaliana(data)).toBe(data);
  });

  it("accetta un numero (es. cella numerica letta come number) come non parsabile", () => {
    expect(parseDataItaliana(12345)).toBeNull();
  });
});

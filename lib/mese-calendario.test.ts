import { describe, expect, it } from "vitest";
import { giorniDelMese, meseCorrente } from "./mese-calendario";

describe("giorniDelMese", () => {
  it("restituisce 31 giorni per un mese a 31 giorni (luglio)", () => {
    const giorni = giorniDelMese("2026-07");
    expect(giorni).toHaveLength(31);
    expect(giorni[0]).toBe("2026-07-01");
    expect(giorni[30]).toBe("2026-07-31");
  });

  it("restituisce 30 giorni per un mese a 30 giorni (aprile)", () => {
    const giorni = giorniDelMese("2026-04");
    expect(giorni).toHaveLength(30);
    expect(giorni[29]).toBe("2026-04-30");
  });

  it("restituisce 28 giorni per febbraio in un anno non bisestile (2026)", () => {
    const giorni = giorniDelMese("2026-02");
    expect(giorni).toHaveLength(28);
    expect(giorni[27]).toBe("2026-02-28");
  });

  it("restituisce 29 giorni per febbraio in un anno bisestile (2028)", () => {
    const giorni = giorniDelMese("2028-02");
    expect(giorni).toHaveLength(29);
    expect(giorni[28]).toBe("2028-02-29");
  });

  it("restituisce ogni elemento nel formato YYYY-MM-DD, in ordine crescente", () => {
    const giorni = giorniDelMese("2026-01");
    expect(giorni.every((g) => /^\d{4}-\d{2}-\d{2}$/.test(g))).toBe(true);
    expect(giorni).toEqual([...giorni].sort());
  });

  it("gestisce correttamente dicembre (mese 12, fine anno)", () => {
    const giorni = giorniDelMese("2026-12");
    expect(giorni).toHaveLength(31);
    expect(giorni[0]).toBe("2026-12-01");
    expect(giorni[30]).toBe("2026-12-31");
  });

  // Review fix (code review Story 9.17): un formato non valido produceva una
  // cascata di NaN silenziosa (Date.UTC(NaN,...) -> getUTCDate() -> NaN ->
  // ciclo che non itera mai -> []) - ora fallisce in modo esplicito invece
  // di restituire un risultato vuoto senza spiegazione.
  it("lancia un errore per un formato non valido (review fix)", () => {
    expect(() => giorniDelMese("abc")).toThrow();
    expect(() => giorniDelMese("2026-13")).toThrow();
    expect(() => giorniDelMese("2026-00")).toThrow();
  });
});

describe("meseCorrente", () => {
  it("restituisce una stringa nel formato YYYY-MM", () => {
    expect(meseCorrente()).toMatch(/^\d{4}-\d{2}$/);
  });
});

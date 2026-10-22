import { describe, expect, it } from "vitest";
import { isMinorenne } from "./eta";

const oggi = new Date("2026-10-19T10:00:00.000Z");

describe("isMinorenne", () => {
  it("true per un'Atleta di 12 anni", () => {
    expect(isMinorenne(new Date("2014-03-01T00:00:00.000Z"), oggi)).toBe(true);
  });

  it("true il giorno prima del 18esimo compleanno", () => {
    expect(isMinorenne("2008-10-20T00:00:00.000Z", oggi)).toBe(true);
  });

  it("false il giorno del 18esimo compleanno", () => {
    expect(isMinorenne("2008-10-19T00:00:00.000Z", oggi)).toBe(false);
  });

  it("false per un'Atleta maggiorenne da anni", () => {
    expect(isMinorenne("1990-01-01T00:00:00.000Z", oggi)).toBe(false);
  });

  // Regola documentata in eta.ts: nato il 29/2, in un anno non bisestile
  // compie gli anni il 1 marzo (18 non e' multiplo di 4: il 18esimo
  // compleanno di un nato il 29/2 cade sempre in un anno non bisestile).
  it("nato il 29 febbraio: ancora minorenne il 28/2, maggiorenne il 1/3 dell'anno non bisestile", () => {
    const nascita = "2008-02-29T00:00:00.000Z";
    expect(isMinorenne(nascita, new Date("2026-02-28T12:00:00.000Z"))).toBe(true);
    expect(isMinorenne(nascita, new Date("2026-03-01T00:00:00.000Z"))).toBe(false);
  });

  it("false (non minorenne) per una data non valida", () => {
    expect(isMinorenne("non-una-data", oggi)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calcolaGiorniAScadenza } from "./calcola-giorni-a-scadenza";

describe("calcolaGiorniAScadenza", () => {
  it("restituisce null se dataFineValidita e' assente (AC #4)", () => {
    expect(calcolaGiorniAScadenza(null, new Date("2026-07-22T10:00:00Z"))).toBeNull();
  });

  it("restituisce 30 quando mancano esattamente 30 giorni di calendario (AC #1)", () => {
    const oggi = new Date("2026-07-22T10:00:00Z");
    expect(calcolaGiorniAScadenza("2026-08-21T00:00:00.000Z", oggi)).toBe(30);
  });

  it("restituisce 7 quando mancano esattamente 7 giorni di calendario (AC #2)", () => {
    const oggi = new Date("2026-07-22T10:00:00Z");
    expect(calcolaGiorniAScadenza("2026-07-29T00:00:00.000Z", oggi)).toBe(7);
  });

  it("restituisce il numero esatto di giorni anche quando non e' 30 ne' 7 (AC #3)", () => {
    const oggi = new Date("2026-07-22T10:00:00Z");
    expect(calcolaGiorniAScadenza("2026-08-06T00:00:00.000Z", oggi)).toBe(15);
    expect(calcolaGiorniAScadenza("2026-07-30T00:00:00.000Z", oggi)).toBe(8);
    expect(calcolaGiorniAScadenza("2026-07-22T00:00:00.000Z", oggi)).toBe(0);
  });

  it("restituisce un numero negativo per un Certificato gia' scaduto", () => {
    const oggi = new Date("2026-07-22T10:00:00Z");
    expect(calcolaGiorniAScadenza("2026-07-21T00:00:00.000Z", oggi)).toBe(-1);
  });

  it("usa il calendario di Europe/Rome per 'oggi', non quello UTC", () => {
    // 2026-01-14T23:30:00Z e' gia' 2026-01-15 a Roma (CET, UTC+1) - se il
    // conteggio usasse il giorno UTC (14), la scadenza del 2026-02-14
    // risulterebbe a 31 giorni invece che a 30 (stesso bug UTC-vs-Europe/Rome
    // gia' corretto in certificato-scaduto.ts, Story 4.5).
    const oggi = new Date("2026-01-14T23:30:00Z");
    expect(calcolaGiorniAScadenza("2026-02-14T00:00:00.000Z", oggi)).toBe(30);
  });
});

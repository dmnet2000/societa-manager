import { describe, expect, it } from "vitest";
import { calcolaIntervalloStagioneCorrente } from "./calcola-intervallo-stagione-corrente";

describe("calcolaIntervalloStagioneCorrente", () => {
  it("returns the interval starting this year when today is in August-December", () => {
    const oggi = new Date(Date.UTC(2026, 9, 15)); // 15 ottobre 2026
    const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

    expect(dataInizio.toISOString()).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
    expect(dataFine.toISOString()).toBe(new Date(Date.UTC(2027, 5, 30)).toISOString());
  });

  it("returns the interval started the previous year when today is in January-July", () => {
    const oggi = new Date(Date.UTC(2026, 2, 10)); // 10 marzo 2026
    const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

    expect(dataInizio.toISOString()).toBe(new Date(Date.UTC(2025, 7, 1)).toISOString());
    expect(dataFine.toISOString()).toBe(new Date(Date.UTC(2026, 5, 30)).toISOString());
  });

  it("treats August 1st itself as the first day of the new season", () => {
    const oggi = new Date(Date.UTC(2026, 7, 1));
    const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

    expect(dataInizio.toISOString()).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString());
    expect(dataFine.toISOString()).toBe(new Date(Date.UTC(2027, 5, 30)).toISOString());
  });

  it("treats June 30th as the last day of the season that started the previous August", () => {
    const oggi = new Date(Date.UTC(2026, 5, 30));
    const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

    expect(dataInizio.toISOString()).toBe(new Date(Date.UTC(2025, 7, 1)).toISOString());
    expect(dataFine.toISOString()).toBe(new Date(Date.UTC(2026, 5, 30)).toISOString());
  });

  it("treats July 31st as still part of the season that started the previous August", () => {
    const oggi = new Date(Date.UTC(2026, 6, 31));
    const { dataInizio, dataFine } = calcolaIntervalloStagioneCorrente(oggi);

    expect(dataInizio.toISOString()).toBe(new Date(Date.UTC(2025, 7, 1)).toISOString());
    expect(dataFine.toISOString()).toBe(new Date(Date.UTC(2026, 5, 30)).toISOString());
  });
});

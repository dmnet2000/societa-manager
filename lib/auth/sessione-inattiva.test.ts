import { describe, expect, it } from "vitest";
import { SOGLIA_INATTIVITA_MS, sessioneScaduta } from "./sessione-inattiva";

describe("sessioneScaduta", () => {
  const ora = 1_000_000_000_000; // timestamp fisso di riferimento

  it("non e' scaduta se l'ultima attivita' e' recente", () => {
    expect(sessioneScaduta(String(ora - 1000), ora)).toBe(false);
  });

  it("e' scaduta se e' passato piu' della soglia dall'ultima attivita'", () => {
    expect(sessioneScaduta(String(ora - SOGLIA_INATTIVITA_MS - 1), ora)).toBe(true);
  });

  it("non e' scaduta esattamente al limite della soglia (> non >=)", () => {
    expect(sessioneScaduta(String(ora - SOGLIA_INATTIVITA_MS), ora)).toBe(false);
  });

  it("non e' scaduta se il cookie e' assente (nessun tracciamento precedente, AC #3)", () => {
    expect(sessioneScaduta(undefined, ora)).toBe(false);
  });

  it("non e' scaduta se il cookie e' malformato (non numerico)", () => {
    expect(sessioneScaduta("non-un-numero", ora)).toBe(false);
  });

  it("non e' scaduta se il cookie e' una stringa vuota", () => {
    expect(sessioneScaduta("", ora)).toBe(false);
  });
});

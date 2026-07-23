import { describe, expect, it } from "vitest";
import { categorizzaStatoCertificato } from "./categorizza-stato-certificato";

describe("categorizzaStatoCertificato", () => {
  const oggi = new Date("2026-07-22T10:00:00Z");

  it("restituisce SENZA_CERTIFICATO se dataFineValidita e' assente (AC #5)", () => {
    expect(categorizzaStatoCertificato(null, null, oggi)).toBe("SENZA_CERTIFICATO");
  });

  it("restituisce SCADUTO se la data e' nel passato, indipendentemente dallo stato (AC #4)", () => {
    expect(categorizzaStatoCertificato("2026-07-21T00:00:00.000Z", "CONFERMATO", oggi)).toBe(
      "SCADUTO"
    );
    expect(categorizzaStatoCertificato("2026-07-21T00:00:00.000Z", "IN_ATTESA", oggi)).toBe(
      "SCADUTO"
    );
  });

  it("restituisce IN_SCADENZA per 0, 15 e 30 giorni se CONFERMATO (AC #3)", () => {
    expect(categorizzaStatoCertificato("2026-07-22T00:00:00.000Z", "CONFERMATO", oggi)).toBe(
      "IN_SCADENZA"
    );
    expect(categorizzaStatoCertificato("2026-08-06T00:00:00.000Z", "CONFERMATO", oggi)).toBe(
      "IN_SCADENZA"
    );
    expect(categorizzaStatoCertificato("2026-08-21T00:00:00.000Z", "CONFERMATO", oggi)).toBe(
      "IN_SCADENZA"
    );
  });

  it("restituisce IN_REGOLA oltre i 30 giorni se CONFERMATO (AC #2)", () => {
    expect(categorizzaStatoCertificato("2026-08-22T00:00:00.000Z", "CONFERMATO", oggi)).toBe(
      "IN_REGOLA"
    );
  });

  it("restituisce SENZA_CERTIFICATO per un Certificato IN_ATTESA con data futura, non IN_REGOLA/IN_SCADENZA (review fix, AC #2/#3)", () => {
    // Caso reale: ri-caricamento di un Certificato gia' confermato (Story
    // 4.4) preserva la vecchia dataFineValidita futura ma forza IN_ATTESA -
    // non deve leggersi come "in regola" finche' non riconfermato.
    expect(categorizzaStatoCertificato("2026-08-22T00:00:00.000Z", "IN_ATTESA", oggi)).toBe(
      "SENZA_CERTIFICATO"
    );
    expect(categorizzaStatoCertificato("2026-08-06T00:00:00.000Z", "IN_ATTESA", oggi)).toBe(
      "SENZA_CERTIFICATO"
    );
  });

  it("restituisce SENZA_CERTIFICATO se calcolaGiorniAScadenza produce NaN (data malformata, review fix)", () => {
    expect(categorizzaStatoCertificato("non-una-data", "CONFERMATO", oggi)).toBe(
      "SENZA_CERTIFICATO"
    );
  });
});

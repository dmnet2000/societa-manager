import { describe, expect, it } from "vitest";
import { calcolaStatoCertificatoVisualizzato } from "./stato-certificato-visualizzato";

const oggi = new Date("2026-07-22T12:00:00.000Z");

describe("calcolaStatoCertificatoVisualizzato", () => {
  it("ritorna 'nessuno' quando non esiste nessuna riga certificato (stato null)", () => {
    expect(calcolaStatoCertificatoVisualizzato(null, null, oggi)).toEqual({
      tipo: "nessuno",
    });
  });

  it("ritorna 'in-attesa' per IN_ATTESA anche senza dataFineValidita ([NOTA UX APERTA] EXPERIENCE.md - nessun badge per questo stato)", () => {
    expect(calcolaStatoCertificatoVisualizzato("IN_ATTESA", null, oggi)).toEqual({
      tipo: "in-attesa",
    });
  });

  it("ritorna 'in-attesa' per IN_ATTESA anche se dataFineValidita preesistente e' ancora futura (ri-caricamento, Story 4.4)", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("IN_ATTESA", "2027-01-01", oggi)
    ).toEqual({ tipo: "in-attesa" });
  });

  it("ritorna 'scaduto' per CONFERMATO con data passata", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2026-07-01", oggi)
    ).toEqual({ tipo: "scaduto" });
  });

  it("ritorna 'scaduto' per CONFERMATO scaduto ieri (giorni = -1, confine immediatamente sotto 0)", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2026-07-21", oggi)
    ).toEqual({ tipo: "scaduto" });
  });

  it("ritorna 'in-scadenza' per CONFERMATO che scade oggi (giorni = 0, incluso nella soglia per definizione della Story 8.5)", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2026-07-22", oggi)
    ).toEqual({ tipo: "in-scadenza" });
  });

  it("ritorna 'in-scadenza' al confine esatto di 30 giorni (soglia FR-16/Story 4.6, inclusa)", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2026-08-21", oggi)
    ).toEqual({ tipo: "in-scadenza" });
  });

  it("ritorna 'in-regola' a 31 giorni (appena fuori dalla soglia di 30)", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2026-08-22", oggi)
    ).toEqual({ tipo: "in-regola", dataFineValidita: "2026-08-22" });
  });

  it("ritorna 'in-regola' con dataFineValidita propagata per una data ben oltre i 30 giorni", () => {
    expect(
      calcolaStatoCertificatoVisualizzato("CONFERMATO", "2027-03-12", oggi)
    ).toEqual({ tipo: "in-regola", dataFineValidita: "2027-03-12" });
  });

  it("ritorna 'in-regola' (fallback difensivo) per CONFERMATO senza dataFineValidita nota", () => {
    expect(calcolaStatoCertificatoVisualizzato("CONFERMATO", null, oggi)).toEqual({
      tipo: "in-regola",
      dataFineValidita: null,
    });
  });
});

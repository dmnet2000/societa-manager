import { describe, expect, it } from "vitest";
import { certificatoScaduto } from "./certificato-scaduto";

const oggi = new Date("2026-07-22T12:00:00.000Z");

describe("certificatoScaduto", () => {
  it("ritorna false quando dataFineValidita e' null (nessun Certificato, o mai confermato - Story 4.4, AC #3)", () => {
    expect(certificatoScaduto(null, oggi)).toBe(false);
  });

  it("ritorna false per una data futura (AC #2)", () => {
    expect(certificatoScaduto("2027-01-01T00:00:00.000Z", oggi)).toBe(false);
  });

  it("ritorna false per la data odierna (non ancora scaduto lo stesso giorno)", () => {
    expect(certificatoScaduto("2026-07-22T00:00:00.000Z", oggi)).toBe(false);
  });

  it("ritorna true per una data passata (AC #1)", () => {
    expect(certificatoScaduto("2026-01-01T00:00:00.000Z", oggi)).toBe(true);
  });

  it("usa il calendario di Europe/Rome, non UTC: un Certificato scaduto ieri (Italia) e' scaduto anche a mezzanotte italiana appena passata, pur essendo ancora 'oggi' in UTC", () => {
    // 2026-07-22T23:30:00.000Z = 2026-07-23 01:30 CEST (UTC+2, ora legale) -
    // in Italia e' gia' il 23 luglio, in UTC e' ancora il 22. Un Certificato
    // scaduto il 22 luglio deve risultare scaduto per l'Allenatore italiano.
    const oggiVicinoMezzanotteItaliana = new Date("2026-07-22T23:30:00.000Z");
    expect(
      certificatoScaduto("2026-07-22T00:00:00.000Z", oggiVicinoMezzanotteItaliana)
    ).toBe(true);
  });

  it("ritorna false per una stringa vuota (nessun Certificato, come null)", () => {
    expect(certificatoScaduto("", oggi)).toBe(false);
  });
});

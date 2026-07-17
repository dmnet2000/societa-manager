import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const analizzaExportFederaleMock = vi.fn();
const trovaPerCodiceFiscaleMock = vi.fn();
const unisciCertificatoMock = vi.fn();
const creaAtletaMock = vi.fn();
const aggiornaAtletaMock = vi.fn();
const elencaAtleteMock = vi.fn();
const elencaIscrizioniPerAnnoMock = vi.fn();
const inserisciIscrizioneMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const trovaAnnoAgonisticoPrecedenteMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("./parser", () => ({
  analizzaExportFederale: analizzaExportFederaleMock,
}));

vi.mock("@/lib/matching-codice-fiscale", () => ({
  trovaPerCodiceFiscale: trovaPerCodiceFiscaleMock,
  unisciCertificato: unisciCertificatoMock,
}));

vi.mock("@/lib/db-rls/atleta", () => ({
  creaAtleta: creaAtletaMock,
  aggiornaAtleta: aggiornaAtletaMock,
  elencaAtlete: elencaAtleteMock,
}));

vi.mock("@/lib/db-rls/iscrizione", () => ({
  elencaIscrizioniPerAnno: elencaIscrizioniPerAnnoMock,
  inserisciIscrizione: inserisciIscrizioneMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
  trovaAnnoAgonisticoPrecedente: trovaAnnoAgonisticoPrecedenteMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { importaAtlete } = await import("./actions");

function buildFormData(file?: File) {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  return formData;
}

const rigaValida = {
  codiceFiscale: "ABC123",
  nome: "Rossi Maria",
  sesso: "F" as const,
  dataNascita: new Date("2010-05-01"),
  luogoNascita: null,
  provinciaNascita: null,
  indirizzo: null,
  cap: null,
  localitaResidenza: null,
  provinciaResidenza: null,
  categoria: null,
  matricola: null,
  dataPrimoTesseramento: null,
  certificato: {
    dataInizioValidita: null,
    dataFineValidita: null,
    mesiValidita: null,
    modulo: null,
  },
};

describe("importaAtlete", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({});
    analizzaExportFederaleMock.mockReset();
    trovaPerCodiceFiscaleMock.mockReset();
    unisciCertificatoMock.mockReset();
    creaAtletaMock.mockReset();
    aggiornaAtletaMock.mockReset();
    elencaAtleteMock.mockReset();
    elencaAtleteMock.mockResolvedValue([]);
    elencaIscrizioniPerAnnoMock.mockReset();
    elencaIscrizioniPerAnnoMock.mockResolvedValue([]);
    inserisciIscrizioneMock.mockReset();
    inserisciIscrizioneMock.mockResolvedValue(true);
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-corrente" });
    trovaAnnoAgonisticoPrecedenteMock.mockReset();
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue(null);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does not parse the file if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(analizzaExportFederaleMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when no file is provided", async () => {
    const result = await importaAtlete(undefined, buildFormData());

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un file Excel da importare." },
    });
  });

  it("returns a friendly error when the file cannot be parsed", async () => {
    analizzaExportFederaleMock.mockRejectedValue(new Error("not a valid xlsx"));

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile leggere il file. Verifica che sia un export valido.",
      },
    });
  });

  it("creates new Atlete and updates existing ones, reporting a summary (AC #1, #5)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida, { ...rigaValida, codiceFiscale: "GIA-PRESENTE" }],
      scartate: [{ numeroRiga: 9, motivo: "Codice Fiscale mancante o vuoto" }],
    });
    trovaPerCodiceFiscaleMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "a1" });
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    aggiornaAtletaMock.mockResolvedValue(undefined);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual({
      success: true,
      create: 1,
      aggiornate: 1,
      riportate: 0,
      scartate: [{ numeroRiga: 9, motivo: "Codice Fiscale mancante o vuoto" }],
    });
    expect(creaAtletaMock).toHaveBeenCalledTimes(1);
    expect(aggiornaAtletaMock).toHaveBeenCalledWith({}, "a1", expect.objectContaining({
      codiceFiscale: "GIA-PRESENTE",
    }));
    expect(revalidatePathMock).toHaveBeenCalledWith("/import-atlete");
  });

  it("returns a friendly error, no crash, when a create/update fails partway through", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockRejectedValue(new Error("db down"));

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message:
          "Import interrotto: alcune Atlete potrebbero non essere state salvate. Riprova.",
      },
    });
  });

  it("merges the certificato for a newly created Atleta when a dataFineValidita is present (AC #1, #2)", async () => {
    const rigaConCertificato = {
      ...rigaValida,
      certificato: {
        dataInizioValidita: new Date("2026-06-01"),
        dataFineValidita: new Date("2027-06-01"),
        mesiValidita: 12,
        modulo: "A",
      },
    };
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaConCertificato],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    unisciCertificatoMock.mockResolvedValue(undefined);

    await importaAtlete(undefined, buildFormData(new File(["x"], "export.xlsx")));

    expect(unisciCertificatoMock).toHaveBeenCalledWith(
      {},
      "nuova-atleta-id",
      rigaConCertificato.certificato
    );
  });

  it("merges the certificato for an existing Atleta using its id (AC #1)", async () => {
    const rigaConCertificato = {
      ...rigaValida,
      certificato: {
        dataInizioValidita: new Date("2026-06-01"),
        dataFineValidita: new Date("2027-06-01"),
        mesiValidita: 12,
        modulo: "A",
      },
    };
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaConCertificato],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue({ id: "atleta-esistente" });
    aggiornaAtletaMock.mockResolvedValue(undefined);
    unisciCertificatoMock.mockResolvedValue(undefined);

    await importaAtlete(undefined, buildFormData(new File(["x"], "export.xlsx")));

    expect(unisciCertificatoMock).toHaveBeenCalledWith(
      {},
      "atleta-esistente",
      rigaConCertificato.certificato
    );
  });

  it("does not call unisciCertificato when the row has no dataFineValidita (AC #3)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");

    await importaAtlete(undefined, buildFormData(new File(["x"], "export.xlsx")));

    expect(unisciCertificatoMock).not.toHaveBeenCalled();
  });

  const atletaUnder13 = {
    id: "atleta-u13-1",
    nome: "Bianchi Sara",
    codiceFiscale: "XYZ999",
    categoria: "Under 13",
  };

  it("carries over an Under 13 Atleta absent from the export but enrolled last season (AC #1)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue({ id: "anno-precedente" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([{ id: "isc-1", atletaId: "atleta-u13-1" }]);
    elencaAtleteMock.mockResolvedValue([atletaUnder13]);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual({
      success: true,
      create: 1,
      aggiornate: 0,
      riportate: 1,
      scartate: [],
    });
    expect(trovaAnnoAgonisticoPrecedenteMock).toHaveBeenCalledWith({
      id: "anno-corrente",
    });
    expect(elencaIscrizioniPerAnnoMock).toHaveBeenCalledWith({}, "anno-precedente");
    expect(inserisciIscrizioneMock).toHaveBeenCalledWith(
      {},
      "atleta-u13-1",
      "anno-corrente"
    );
  });

  it("does not increment riportate when inserisciIscrizione is a true no-op (review fix: era gia' attiva)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue({ id: "anno-precedente" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([{ id: "isc-1", atletaId: "atleta-u13-1" }]);
    elencaAtleteMock.mockResolvedValue([atletaUnder13]);
    inserisciIscrizioneMock.mockResolvedValue(false);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual(
      expect.objectContaining({ success: true, riportate: 0 })
    );
    expect(inserisciIscrizioneMock).toHaveBeenCalledWith(
      {},
      "atleta-u13-1",
      "anno-corrente"
    );
  });

  it("does not carry over an Under 13 Atleta already present in this export (AC #2)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [{ ...rigaValida, codiceFiscale: "XYZ999" }],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue({ id: "atleta-u13-1" });
    aggiornaAtletaMock.mockResolvedValue(undefined);
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue({ id: "anno-precedente" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([{ id: "isc-1", atletaId: "atleta-u13-1" }]);
    elencaAtleteMock.mockResolvedValue([atletaUnder13]);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual(
      expect.objectContaining({ success: true, riportate: 0 })
    );
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });

  it("does not carry over an Atleta that is not Under 13 (AC #2)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue({ id: "anno-precedente" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([{ id: "isc-2", atletaId: "atleta-non-u13" }]);
    elencaAtleteMock.mockResolvedValue([
      { id: "atleta-non-u13", nome: "Verdi Anna", codiceFiscale: "AAA111", categoria: "Under 16" },
    ]);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual(
      expect.objectContaining({ success: true, riportate: 0 })
    );
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });

  it("does not carry over an Under 13 Atleta with no active Iscrizione last season (AC #2)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue({ id: "anno-precedente" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([]);
    elencaAtleteMock.mockResolvedValue([atletaUnder13]);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual(
      expect.objectContaining({ success: true, riportate: 0 })
    );
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });

  it("skips rollover entirely when there is no previous AnnoAgonistico, no error (AC #5)", async () => {
    analizzaExportFederaleMock.mockResolvedValue({
      righe: [rigaValida],
      scartate: [],
    });
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);
    creaAtletaMock.mockResolvedValue("nuova-atleta-id");
    trovaAnnoAgonisticoPrecedenteMock.mockResolvedValue(null);

    const result = await importaAtlete(
      undefined,
      buildFormData(new File(["x"], "export.xlsx"))
    );

    expect(result).toEqual(
      expect.objectContaining({ success: true, riportate: 0 })
    );
    expect(elencaIscrizioniPerAnnoMock).not.toHaveBeenCalled();
    expect(elencaAtleteMock).not.toHaveBeenCalled();
    expect(inserisciIscrizioneMock).not.toHaveBeenCalled();
  });
});

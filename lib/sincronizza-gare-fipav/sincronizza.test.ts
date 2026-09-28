import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const partitaFindUniqueMock = vi.fn();
const partitaFindUniqueOrThrowMock = vi.fn();
const partitaCreateMock = vi.fn();
const partitaUpdateMock = vi.fn();
const analizzaHtmlGareFipavMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partita: {
      findUnique: partitaFindUniqueMock,
      findUniqueOrThrow: partitaFindUniqueOrThrowMock,
      create: partitaCreateMock,
      update: partitaUpdateMock,
    },
  },
}));

vi.mock("@/lib/sincronizza-gare-fipav/parser", () => ({
  analizzaHtmlGareFipav: analizzaHtmlGareFipavMock,
}));

vi.stubGlobal("fetch", fetchMock);

const { sincronizzaCampionatoFipav } = await import("./sincronizza");

const RIGA_VALIDA = {
  garaNumero: "1568",
  giornata: "1",
  data: "2025-10-25",
  ora: "20:30",
  squadraCasa: "VOLLEY MOGLIANO",
  squadraOspite: "SPACCIO OCCHIALI VISION",
  risultato: "3 - 0",
  parziali: "25-19,29-27,25-21",
  statoDescrizione: "Gara omologata",
  impianto: "Palestra Olme",
  indirizzoImpianto: "Mogliano Veneto TV, Via Olme 12",
};

function buildResponse(ok: boolean, status: number, html: string) {
  return { ok, status, text: async () => html };
}

const PARAMS = {
  gruppoId: "gruppo-1",
  campionatoId: "campionato-1",
  linkFipav: "https://risultati.fipav.it/campionato/1",
};

// Story 10.12: logica estratta da sincronizzaGareFipav (Story 10.11,
// app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts) -
// questi test coprono lo stesso comportamento osservabile di prima (fetch +
// parsing + upsert con protezione modificataManualmente), ora esercitato
// direttamente sulla funzione condivisa, senza autorizzazione (responsabilita'
// del chiamante - vedi sincronizza-fipav-actions.test.ts e
// app/api/cron/sincronizza-fipav/route.test.ts).
describe("sincronizzaCampionatoFipav", () => {
  beforeEach(() => {
    partitaFindUniqueMock.mockReset();
    partitaFindUniqueMock.mockResolvedValue(null);
    partitaFindUniqueOrThrowMock.mockReset();
    partitaCreateMock.mockReset();
    partitaCreateMock.mockResolvedValue({});
    partitaUpdateMock.mockReset();
    partitaUpdateMock.mockResolvedValue({});
    analizzaHtmlGareFipavMock.mockReset();
    analizzaHtmlGareFipavMock.mockReturnValue({ righe: [RIGA_VALIDA], scartate: [] });
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(buildResponse(true, 200, "<table></table>"));
  });

  it("creates a new Partita for a Gara N not seen before", async () => {
    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://risultati.fipav.it/campionato/1",
      expect.objectContaining({ redirect: "follow" })
    );
    expect(partitaFindUniqueMock).toHaveBeenCalledWith({
      where: {
        gruppoId_campionatoId_garaNumero: {
          gruppoId: "gruppo-1",
          campionatoId: "campionato-1",
          garaNumero: "1568",
        },
      },
    });
    expect(partitaCreateMock).toHaveBeenCalledWith({
      data: { ...RIGA_VALIDA, gruppoId: "gruppo-1", campionatoId: "campionato-1" },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      create: 1,
      aggiornate: 0,
      bloccate: 0,
      scartate: [],
    });
  });

  it("updates all fields of an existing Partita that was never modified manually", async () => {
    partitaFindUniqueMock.mockResolvedValue({ id: "partita-1", modificataManualmente: false });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      data: {
        campionatoId: "campionato-1",
        giornata: "1",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3 - 0",
        parziali: "25-19,29-27,25-21",
        statoDescrizione: "Gara omologata",
        data: "2025-10-25",
        ora: "20:30",
        impianto: "Palestra Olme",
        indirizzoImpianto: "Mogliano Veneto TV, Via Olme 12",
      },
    });
    expect(partitaCreateMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      create: 0,
      aggiornate: 1,
      bloccate: 0,
      scartate: [],
    });
  });

  it("keeps data/ora/impianto/indirizzoImpianto unchanged for a Partita modified manually, but still updates risultato/parziali/statoDescrizione/giornata, counted as bloccata", async () => {
    partitaFindUniqueMock.mockResolvedValue({ id: "partita-1", modificataManualmente: true });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      data: {
        campionatoId: "campionato-1",
        giornata: "1",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3 - 0",
        parziali: "25-19,29-27,25-21",
        statoDescrizione: "Gara omologata",
      },
    });
    expect(result).toEqual({
      success: true,
      create: 0,
      aggiornate: 1,
      bloccate: 1,
      scartate: [],
    });
  });

  it("falls back to an update instead of aborting when create hits a concurrent P2002 (TOCTOU)", async () => {
    partitaCreateMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    partitaFindUniqueOrThrowMock.mockResolvedValue({
      id: "partita-concorrente",
      modificataManualmente: false,
    });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-concorrente" },
      data: {
        campionatoId: "campionato-1",
        giornata: "1",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3 - 0",
        parziali: "25-19,29-27,25-21",
        statoDescrizione: "Gara omologata",
        data: "2025-10-25",
        ora: "20:30",
        impianto: "Palestra Olme",
        indirizzoImpianto: "Mogliano Veneto TV, Via Olme 12",
      },
    });
    expect(result).toEqual({
      success: true,
      create: 0,
      aggiornate: 1,
      bloccate: 0,
      scartate: [],
    });
  });

  it("keeps data/ora/impianto/indirizzoImpianto unchanged and counts as bloccata when the concurrent P2002 row was modified manually", async () => {
    partitaCreateMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    partitaFindUniqueOrThrowMock.mockResolvedValue({
      id: "partita-concorrente",
      modificataManualmente: true,
    });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-concorrente" },
      data: {
        campionatoId: "campionato-1",
        giornata: "1",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3 - 0",
        parziali: "25-19,29-27,25-21",
        statoDescrizione: "Gara omologata",
      },
    });
    expect(result).toEqual({
      success: true,
      create: 0,
      aggiornate: 1,
      bloccate: 1,
      scartate: [],
    });
  });

  it("returns the discarded rows in the summary without failing the sync", async () => {
    analizzaHtmlGareFipavMock.mockReturnValue({
      righe: [RIGA_VALIDA],
      scartate: [{ numeroRiga: 3, motivo: "Data/ora mancante o in formato non riconosciuto" }],
    });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(result).toEqual({
      success: true,
      create: 1,
      aggiornate: 0,
      bloccate: 0,
      scartate: [{ numeroRiga: 3, motivo: "Data/ora mancante o in formato non riconosciuto" }],
    });
  });

  it("returns an explicit error, no write, when the fetch fails (network/timeout)", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile raggiungere il portale FIPAV. Riprova più tardi.",
      },
    });
    expect(analizzaHtmlGareFipavMock).not.toHaveBeenCalled();
    expect(partitaCreateMock).not.toHaveBeenCalled();
  });

  it("returns an explicit error, no write, when the fetch responds with a non-ok status", async () => {
    fetchMock.mockResolvedValue(buildResponse(false, 503, ""));

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Il portale FIPAV ha risposto con un errore (503). Riprova più tardi.",
      },
    });
    expect(analizzaHtmlGareFipavMock).not.toHaveBeenCalled();
  });

  it("returns an explicit error, no write, when the expected tbl-risultati table is missing (page format changed)", async () => {
    analizzaHtmlGareFipavMock.mockImplementation(() => {
      throw new Error("Tabella dei risultati non trovata nella pagina del portale FIPAV.");
    });

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Tabella dei risultati non trovata nella pagina del portale FIPAV.",
      },
    });
    expect(partitaCreateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when a Prisma write fails mid-sync", async () => {
    partitaCreateMock.mockRejectedValue(new Error("db down"));

    const result = await sincronizzaCampionatoFipav(PARAMS);

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message:
          "Sincronizzazione interrotta: alcune Partite potrebbero non essere state salvate. Riprova.",
      },
    });
  });
});

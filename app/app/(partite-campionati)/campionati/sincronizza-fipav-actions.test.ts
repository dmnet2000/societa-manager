import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const risolviAutorizzazioneGruppoMock = vi.fn();
const campionatoFindUniqueMock = vi.fn();
const partitaFindUniqueMock = vi.fn();
const partitaFindUniqueOrThrowMock = vi.fn();
const partitaCreateMock = vi.fn();
const partitaUpdateMock = vi.fn();
const analizzaHtmlGareFipavMock = vi.fn();
const revalidatePathMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/app/app/(partite-campionati)/autorizzazione", () => ({
  risolviAutorizzazioneGruppo: risolviAutorizzazioneGruppoMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campionato: { findUnique: campionatoFindUniqueMock },
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

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.stubGlobal("fetch", fetchMock);

const { sincronizzaGareFipav } = await import("./sincronizza-fipav-actions");

function buildFormData(fields: { gruppoId?: string; campionatoId?: string }) {
  const formData = new FormData();
  if (fields.gruppoId !== undefined) formData.append("gruppoId", fields.gruppoId);
  if (fields.campionatoId !== undefined) formData.append("campionatoId", fields.campionatoId);
  return formData;
}

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

describe("sincronizzaGareFipav", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    risolviAutorizzazioneGruppoMock.mockReset();
    risolviAutorizzazioneGruppoMock.mockResolvedValue({
      autorizzato: true,
      annoCorrenteId: "anno-1",
    });
    campionatoFindUniqueMock.mockReset();
    campionatoFindUniqueMock.mockResolvedValue({
      gruppoId: "gruppo-1",
      linkFipav: "https://risultati.fipav.it/campionato/1",
    });
    partitaFindUniqueMock.mockReset();
    partitaFindUniqueMock.mockResolvedValue(null);
    partitaFindUniqueOrThrowMock.mockReset();
    partitaCreateMock.mockReset();
    partitaCreateMock.mockResolvedValue({});
    partitaUpdateMock.mockReset();
    partitaUpdateMock.mockResolvedValue({});
    analizzaHtmlGareFipavMock.mockReset();
    analizzaHtmlGareFipavMock.mockReturnValue({ righe: [RIGA_VALIDA], scartate: [] });
    revalidatePathMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(buildResponse(true, 200, "<table></table>"));
  });

  it("returns FORBIDDEN and does not touch anything when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(risolviAutorizzazioneGruppoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when campionatoId is missing", async () => {
    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non specificato." },
    });
    expect(risolviAutorizzazioneGruppoMock).not.toHaveBeenCalled();
  });

  it("propagates the FORBIDDEN/VALIDATION error from risolviAutorizzazioneGruppo (e.g. Allenatore not coaching the Gruppo)", async () => {
    risolviAutorizzazioneGruppoMock.mockResolvedValue({
      autorizzato: false,
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(campionatoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato does not exist", async () => {
    campionatoFindUniqueMock.mockResolvedValue(null);

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato belongs to a different Gruppo", async () => {
    campionatoFindUniqueMock.mockResolvedValue({
      gruppoId: "altro-gruppo",
      linkFipav: "https://risultati.fipav.it/campionato/1",
    });

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects when linkFipav is empty, even if the action is invoked directly (AC)", async () => {
    campionatoFindUniqueMock.mockResolvedValue({ gruppoId: "gruppo-1", linkFipav: null });

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Nessun link al portale FIPAV impostato per questo Campionato.",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a new Partita for a Gara N not seen before", async () => {
    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/campionati");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/partite");
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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    // Review fix (Verification Gap Reviewer): asserzione sull'intero oggetto
    // data (non expect.objectContaining) - prima non verificava la presenza/
    // assenza dei 4 campi bloccabili in questo ramo, una regressione qui
    // sarebbe passata inosservata.
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

  // Review fix (Verification Gap Reviewer): il ramo P2002 non era mai stato
  // esercitato con una Partita concorrente gia' modificata a mano - ne'
  // l'incremento di "bloccate" ne' l'esclusione dei campi bloccabili erano
  // coperti per questo ramo (solo per il ramo primario "esistente").
  it("keeps data/ora/impianto/indirizzoImpianto unchanged and counts as bloccata when the concurrent P2002 row was modified manually", async () => {
    partitaCreateMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    partitaFindUniqueOrThrowMock.mockResolvedValue({
      id: "partita-concorrente",
      modificataManualmente: true,
    });

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

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

    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message:
          "Sincronizzazione interrotta: alcune Partite potrebbero non essere state salvate. Riprova.",
      },
    });
  });
});

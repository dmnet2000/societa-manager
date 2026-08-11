import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const risolviAutorizzazioneGruppoMock = vi.fn();
const campionatoFindUniqueMock = vi.fn();
const partitaFindUniqueMock = vi.fn();
const partitaFindUniqueOrThrowMock = vi.fn();
const partitaCreateMock = vi.fn();
const partitaUpdateMock = vi.fn();
const analizzaFileGareMock = vi.fn();
const revalidatePathMock = vi.fn();

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

vi.mock("@/lib/importa-gare/parser", () => ({
  analizzaFileGare: analizzaFileGareMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { importaGare } = await import("./importa-gare-actions");

function buildFormData(fields: {
  gruppoId?: string;
  campionatoId?: string;
  file?: File;
}) {
  const formData = new FormData();
  if (fields.gruppoId !== undefined) formData.append("gruppoId", fields.gruppoId);
  if (fields.campionatoId !== undefined) formData.append("campionatoId", fields.campionatoId);
  if (fields.file) formData.append("file", fields.file);
  return formData;
}

function buildFile() {
  return new File([new Uint8Array([1, 2, 3])], "gare.xls", {
    type: "application/vnd.ms-excel",
  });
}

const RIGA_VALIDA = {
  garaNumero: "1568",
  giornata: "1",
  data: "2025-10-25",
  ora: "20:30",
  squadraCasa: "VOLLEY MOGLIANO",
  squadraOspite: "SPACCIO OCCHIALI VISION",
  risultato: "3-1",
  parziali: "21-25 25-14 25-18 26-24",
  statoDescrizione: "gara omologata",
  impianto: "Palestra Olme - MOGLIANO VENETO (TV)",
  indirizzoImpianto: "Via Olme",
};

describe("importaGare", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    risolviAutorizzazioneGruppoMock.mockReset();
    risolviAutorizzazioneGruppoMock.mockResolvedValue({
      autorizzato: true,
      annoCorrenteId: "anno-1",
    });
    campionatoFindUniqueMock.mockReset();
    campionatoFindUniqueMock.mockResolvedValue({ gruppoId: "gruppo-1" });
    partitaFindUniqueMock.mockReset();
    partitaFindUniqueMock.mockResolvedValue(null);
    partitaFindUniqueOrThrowMock.mockReset();
    partitaCreateMock.mockReset();
    partitaCreateMock.mockResolvedValue({});
    partitaUpdateMock.mockReset();
    partitaUpdateMock.mockResolvedValue({});
    analizzaFileGareMock.mockReset();
    analizzaFileGareMock.mockReturnValue({ righe: [RIGA_VALIDA], scartate: [] });
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does not touch anything when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(analizzaFileGareMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await importaGare(
      undefined,
      buildFormData({ campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(risolviAutorizzazioneGruppoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when campionatoId is missing", async () => {
    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non specificato." },
    });
    expect(risolviAutorizzazioneGruppoMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when no file is provided, no downstream call", async () => {
    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un file Excel da importare." },
    });
    expect(risolviAutorizzazioneGruppoMock).not.toHaveBeenCalled();
  });

  it("propagates the FORBIDDEN/VALIDATION error from risolviAutorizzazioneGruppo (e.g. Allenatore not coaching the Gruppo)", async () => {
    risolviAutorizzazioneGruppoMock.mockResolvedValue({
      autorizzato: false,
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(campionatoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato does not exist (AC #6)", async () => {
    campionatoFindUniqueMock.mockResolvedValue(null);

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(campionatoFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      select: { gruppoId: true },
    });
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    });
    expect(analizzaFileGareMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato belongs to a different Gruppo (Story 10.7, AC #6)", async () => {
    campionatoFindUniqueMock.mockResolvedValue({ gruppoId: "altro-gruppo" });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    });
    expect(analizzaFileGareMock).not.toHaveBeenCalled();
  });

  it("returns a validation error with the parser's message when the file has missing essential columns (AC #3)", async () => {
    analizzaFileGareMock.mockImplementation(() => {
      throw new Error("Intestazioni non riconosciute: colonne mancanti (Gara N).");
    });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Intestazioni non riconosciute: colonne mancanti (Gara N).",
      },
    });
    expect(partitaCreateMock).not.toHaveBeenCalled();
  });

  it("creates a new Partita for a Gara N not seen before (AC #1)", async () => {
    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
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
    expect(result).toEqual({ success: true, create: 1, aggiornate: 0, scartate: [] });
  });

  it("updates the existing Partita in place when Gara N already exists for this Gruppo (AC #2)", async () => {
    partitaFindUniqueMock.mockResolvedValue({ id: "partita-1" });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      data: { ...RIGA_VALIDA, campionatoId: "campionato-1" },
    });
    expect(partitaCreateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, create: 0, aggiornate: 1, scartate: [] });
  });

  it("falls back to an update instead of aborting when create hits a concurrent P2002 (TOCTOU review fix)", async () => {
    partitaCreateMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    partitaFindUniqueOrThrowMock.mockResolvedValue({ id: "partita-concorrente" });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(partitaFindUniqueOrThrowMock).toHaveBeenCalledWith({
      where: {
        gruppoId_campionatoId_garaNumero: {
          gruppoId: "gruppo-1",
          campionatoId: "campionato-1",
          garaNumero: "1568",
        },
      },
    });
    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-concorrente" },
      data: { ...RIGA_VALIDA, campionatoId: "campionato-1" },
    });
    expect(result).toEqual({ success: true, create: 0, aggiornate: 1, scartate: [] });
  });

  it("returns the discarded rows in the summary without failing the import (AC #4, #5)", async () => {
    analizzaFileGareMock.mockReturnValue({
      righe: [RIGA_VALIDA],
      scartate: [{ numeroRiga: 3, motivo: "Data mancante o in formato non riconosciuto" }],
    });

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      success: true,
      create: 1,
      aggiornate: 0,
      scartate: [{ numeroRiga: 3, motivo: "Data mancante o in formato non riconosciuto" }],
    });
  });

  it("returns a friendly error, no crash, when a Prisma write fails mid-import", async () => {
    partitaCreateMock.mockRejectedValue(new Error("db down"));

    const result = await importaGare(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1", file: buildFile() })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Import interrotto: alcune Partite potrebbero non essere state salvate. Riprova.",
      },
    });
  });
});

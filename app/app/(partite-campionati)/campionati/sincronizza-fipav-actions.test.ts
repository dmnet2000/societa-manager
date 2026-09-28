import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const risolviAutorizzazioneGruppoMock = vi.fn();
const campionatoFindUniqueMock = vi.fn();
const sincronizzaCampionatoFipavMock = vi.fn();
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
  },
}));

// Story 10.12: la Server Action e' ridotta a un chiamante sottile della
// funzione condivisa - questo test copre solo autorizzazione/lookup/inoltro
// del risultato, non piu' il dettaglio fetch/parsing/upsert (spostato in
// lib/sincronizza-gare-fipav/sincronizza.test.ts, stesso comportamento
// osservabile di prima).
vi.mock("@/lib/sincronizza-gare-fipav/sincronizza", () => ({
  sincronizzaCampionatoFipav: sincronizzaCampionatoFipavMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { sincronizzaGareFipav } = await import("./sincronizza-fipav-actions");

function buildFormData(fields: { gruppoId?: string; campionatoId?: string }) {
  const formData = new FormData();
  if (fields.gruppoId !== undefined) formData.append("gruppoId", fields.gruppoId);
  if (fields.campionatoId !== undefined) formData.append("campionatoId", fields.campionatoId);
  return formData;
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
    sincronizzaCampionatoFipavMock.mockReset();
    sincronizzaCampionatoFipavMock.mockResolvedValue({
      success: true,
      create: 1,
      aggiornate: 0,
      bloccate: 0,
      scartate: [],
    });
    revalidatePathMock.mockReset();
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
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
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
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
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
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
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
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("delegates to sincronizzaCampionatoFipav with the resolved params, revalidates, and forwards a successful result", async () => {
    const result = await sincronizzaGareFipav(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledWith({
      gruppoId: "gruppo-1",
      campionatoId: "campionato-1",
      linkFipav: "https://risultati.fipav.it/campionato/1",
    });
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

  it("forwards an error result from sincronizzaCampionatoFipav without revalidating", async () => {
    sincronizzaCampionatoFipavMock.mockResolvedValue({
      error: {
        code: "INTERNAL",
        message: "Impossibile raggiungere il portale FIPAV. Riprova più tardi.",
      },
    });

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
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

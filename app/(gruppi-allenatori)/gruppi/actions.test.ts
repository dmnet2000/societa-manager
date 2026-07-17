import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const gruppoCreateMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const gruppoAllenatoreCreateMock = vi.fn();
const gruppoAtletaUpsertMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: { create: gruppoCreateMock, findUnique: gruppoFindUniqueMock },
    gruppoAllenatore: { create: gruppoAllenatoreCreateMock },
    gruppoAtleta: { upsert: gruppoAtletaUpsertMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaGruppo, assegnaAllenatore, assegnaAtleta } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  risolviAnnoAgonisticoCorrenteMock.mockReset();
  gruppoCreateMock.mockReset();
  gruppoFindUniqueMock.mockReset();
  gruppoAllenatoreCreateMock.mockReset();
  gruppoAtletaUpsertMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("creaGruppo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
    expect(gruppoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing (AC #3)", async () => {
    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "  ", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Gruppo è obbligatorio." },
    });
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
    expect(gruppoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming the categoria, not the nome, when categoria is missing (review fix, AC #3)", async () => {
    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La categoria del Gruppo è obbligatoria." },
    });
    expect(gruppoCreateMock).not.toHaveBeenCalled();
  });

  it("resolves the current AnnoAgonistico and creates the Gruppo linked to it (AC #1, #2)", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoCreateMock.mockResolvedValue({ id: "g1" });

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({ success: true });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(gruppoCreateMock).toHaveBeenCalledWith({
      data: { nome: "Under 13", categoria: "Under 13", annoAgonisticoId: "anno-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/gruppi");
  });

  it("returns a friendly error, no crash, when resolving the AnnoAgonistico fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockRejectedValue(new Error("db down"));

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare il Gruppo. Riprova." },
    });
    expect(gruppoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoCreateMock.mockRejectedValue(new Error("db down"));

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare il Gruppo. Riprova." },
    });
  });
});

describe("assegnaAllenatore", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(gruppoAllenatoreCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming gruppoId when it is missing", async () => {
    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "", allenatoreId: "a1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoAllenatoreCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming allenatoreId when it is missing", async () => {
    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Allenatore non specificato." },
    });
    expect(gruppoAllenatoreCreateMock).not.toHaveBeenCalled();
  });

  it("assigns the Allenatore to the Gruppo (AC #1, #2)", async () => {
    gruppoAllenatoreCreateMock.mockResolvedValue({ id: "ga1" });

    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAllenatoreCreateMock).toHaveBeenCalledWith({
      data: { gruppoId: "g1", allenatoreId: "a1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/gruppi");
  });

  it("treats a unique constraint violation (P2002) as idempotent success (AC #3)", async () => {
    gruppoAllenatoreCreateMock.mockRejectedValue({ code: "P2002" });

    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/gruppi");
  });

  it("returns a friendly error, no crash, on any other error (e.g. FK violation)", async () => {
    gruppoAllenatoreCreateMock.mockRejectedValue(new Error("foreign key constraint"));

    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "non-esiste" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare l'Allenatore. Riprova." },
    });
  });
});

describe("assegnaAtleta", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming gruppoId when it is missing", async () => {
    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming atletaId when it is missing", async () => {
    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when finding the Gruppo throws (e.g. connection error)", async () => {
    gruppoFindUniqueMock.mockRejectedValue(new Error("connection lost"));

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare l'Atleta. Riprova." },
    });
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "non-esiste", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(gruppoFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "non-esiste" },
      select: { annoAgonisticoId: true },
    });
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("upserts on (atletaId, annoAgonisticoId) using the Gruppo's own season (AC #1, #2, #3)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAtletaUpsertMock).toHaveBeenCalledWith({
      where: { atletaId_annoAgonisticoId: { atletaId: "at1", annoAgonisticoId: "anno-1" } },
      create: { atletaId: "at1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      update: { gruppoId: "g1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/gruppi");
  });

  it("returns a friendly error, no crash, when the upsert fails (e.g. FK violation on atletaId)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpsertMock.mockRejectedValue(new Error("foreign key constraint"));

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "non-esiste" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare l'Atleta. Riprova." },
    });
  });
});

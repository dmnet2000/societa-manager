import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const partitaFindUniqueMock = vi.fn();
const partitaDeleteMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: { findUnique: gruppoFindUniqueMock },
    allenatore: { findFirst: allenatoreFindFirstMock },
    gruppoAllenatore: { findUnique: gruppoAllenatoreFindUniqueMock },
    partita: { findUnique: partitaFindUniqueMock, delete: partitaDeleteMock },
  },
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { cancellaPartita } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function buildUser(ruoli: string[]) {
  return { data: { user: { id: "auth-u1", app_metadata: { ruoli } } } };
}

const ANNO_CORRENTE = { id: "anno-1" };

describe("cancellaPartita", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    getUserMock.mockReset();
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockReset();
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    allenatoreFindFirstMock.mockReset();
    gruppoAllenatoreFindUniqueMock.mockReset();
    partitaFindUniqueMock.mockReset();
    partitaFindUniqueMock.mockResolvedValue({ gruppoId: "gruppo-1" });
    partitaDeleteMock.mockReset();
    partitaDeleteMock.mockResolvedValue({});
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(partitaDeleteMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when partitaId is missing", async () => {
    const result = await cancellaPartita(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Partita non specificata." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Partita does not exist", async () => {
    partitaFindUniqueMock.mockResolvedValue(null);

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-inesistente" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Partita non trovata." },
    });
    expect(partitaDeleteMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the Gruppo owning the Partita", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(partitaDeleteMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the Gruppo owning the Partita to delete it", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(partitaFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      select: { gruppoId: true },
    });
    expect(partitaDeleteMock).toHaveBeenCalledWith({ where: { id: "partita-1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/partite");
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to delete any Partita without ownership check", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(partitaDeleteMock).toHaveBeenCalledWith({ where: { id: "partita-1" } });
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to delete a Partita of a Gruppo from a past season (review fix)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(partitaDeleteMock).toHaveBeenCalledWith({ where: { id: "partita-1" } });
    expect(result).toEqual({ success: true });
  });

  it("still refuses an Allenatore trying to delete a Partita of a Gruppo from a past season", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(partitaDeleteMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when partita.delete throws", async () => {
    partitaDeleteMock.mockRejectedValueOnce(new Error("db down"));

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare la Partita. Riprova." },
    });
  });

  it("treats a concurrent double-delete (Prisma P2025) as idempotent success (review fix)", async () => {
    partitaDeleteMock.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" })
    );

    const result = await cancellaPartita(
      undefined,
      buildFormData({ partitaId: "partita-1" })
    );

    expect(revalidatePathMock).toHaveBeenCalledWith("/partite");
    expect(result).toEqual({ success: true });
  });
});

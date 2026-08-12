import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const partitaFindUniqueMock = vi.fn();
const partitaDeleteMock = vi.fn();
const partitaUpdateMock = vi.fn();
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
    partita: {
      findUnique: partitaFindUniqueMock,
      delete: partitaDeleteMock,
      update: partitaUpdateMock,
    },
  },
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { cancellaPartita, aggiornaPartita } = await import("./actions");

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

// Beforeeach top-level (non annidato in un solo describe) - condiviso da
// cancellaPartita e aggiornaPartita, stesso pattern gia' stabilito in
// app/(gruppi-allenatori)/gruppi/actions.test.ts.
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
  partitaUpdateMock.mockReset();
  partitaUpdateMock.mockResolvedValue({});
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
  revalidatePathMock.mockReset();
});

describe("cancellaPartita", () => {
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/partite");
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

    expect(revalidatePathMock).toHaveBeenCalledWith("/app/partite");
    expect(result).toEqual({ success: true });
  });
});

describe("aggiornaPartita", () => {
  const campiValidi = {
    partitaId: "partita-1",
    data: "2026-09-15",
    ora: "18:30",
    impianto: "Palestra Comunale",
    indirizzoImpianto: "Via Roma 1",
  };

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when partitaId is missing", async () => {
    const result = await aggiornaPartita(
      undefined,
      buildFormData({ ...campiValidi, partitaId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Partita non specificata." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Partita does not exist", async () => {
    partitaFindUniqueMock.mockResolvedValue(null);

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Partita non trovata." },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the Gruppo owning the Partita", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects a Partita whose Gruppo belongs to a past season, even for Admin (a differenza di cancellaPartita)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("still refuses an Allenatore trying to update a Partita of a Gruppo from a past season", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the data format is invalid", async () => {
    const result = await aggiornaPartita(
      undefined,
      buildFormData({ ...campiValidi, data: "15-09-2026" })
    );

    expect(result).toEqual({ error: { code: "VALIDATION", message: "Data non valida." } });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the data is not a real calendar date", async () => {
    const result = await aggiornaPartita(
      undefined,
      buildFormData({ ...campiValidi, data: "2026-02-30" })
    );

    expect(result).toEqual({ error: { code: "VALIDATION", message: "Data non valida." } });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the ora format is invalid", async () => {
    const result = await aggiornaPartita(
      undefined,
      buildFormData({ ...campiValidi, ora: "9:00" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato ora non valido (usa HH:MM)." },
    });
    expect(partitaUpdateMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the Gruppo owning the Partita to update it", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      data: {
        data: "2026-09-15",
        ora: "18:30",
        impianto: "Palestra Comunale",
        indirizzoImpianto: "Via Roma 1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/partite");
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to update any Partita without ownership check", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(partitaUpdateMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("saves impianto/indirizzoImpianto as null when left empty", async () => {
    const result = await aggiornaPartita(
      undefined,
      buildFormData({ ...campiValidi, impianto: "", indirizzoImpianto: "" })
    );

    expect(partitaUpdateMock).toHaveBeenCalledWith({
      where: { id: "partita-1" },
      data: {
        data: "2026-09-15",
        ora: "18:30",
        impianto: null,
        indirizzoImpianto: null,
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, when partita.update throws", async () => {
    partitaUpdateMock.mockRejectedValueOnce(new Error("db down"));

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Partita. Riprova." },
    });
  });

  it("returns 'Partita non trovata' when the Partita is deleted concurrently (Prisma P2025, review fix)", async () => {
    partitaUpdateMock.mockRejectedValueOnce(
      Object.assign(new Error("Record to update not found."), { code: "P2025" })
    );

    const result = await aggiornaPartita(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Partita non trovata." },
    });
  });
});

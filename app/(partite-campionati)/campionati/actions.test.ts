import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const campionatoFindFirstMock = vi.fn();
const campionatoFindUniqueMock = vi.fn();
const gruppoCampionatoCreateMock = vi.fn();
const txCampionatoCreateMock = vi.fn();
const txGruppoCampionatoCreateMock = vi.fn();
const transactionMock = vi.fn(
  async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      campionato: { create: txCampionatoCreateMock },
      gruppoCampionato: { create: txGruppoCampionatoCreateMock },
    })
);
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
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
    campionato: { findFirst: campionatoFindFirstMock, findUnique: campionatoFindUniqueMock },
    gruppoCampionato: { create: gruppoCampionatoCreateMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaCampionato, collegaCampionatoEsistente } = await import("./actions");

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

describe("creaCampionato", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    getUserMock.mockReset();
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockReset();
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    allenatoreFindFirstMock.mockReset();
    gruppoAllenatoreFindUniqueMock.mockReset();
    campionatoFindFirstMock.mockReset();
    campionatoFindFirstMock.mockResolvedValue(null);
    txCampionatoCreateMock.mockReset();
    txCampionatoCreateMock.mockResolvedValue({ id: "campionato-1" });
    txGruppoCampionatoCreateMock.mockReset();
    txGruppoCampionatoCreateMock.mockResolvedValue({});
    transactionMock.mockClear();
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing, no downstream call", async () => {
    const result = await creaCampionato(undefined, buildFormData({ gruppoId: "gruppo-1" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Campionato è obbligatorio." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing, no downstream call", async () => {
    const result = await creaCampionato(undefined, buildFormData({ nome: "Serie D" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when no Anno Agonistico exists yet", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-inesistente" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when the Gruppo belongs to a past season (review fix)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-vecchio" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the target Gruppo (AC #4)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(gruppoAllenatoreFindUniqueMock).toHaveBeenCalledWith({
      where: { gruppoId_allenatoreId: { gruppoId: "gruppo-1", allenatoreId: "allenatore-1" } },
    });
    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuses a Ruolo ALLENATORE caller with no Allenatore linked at all", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue(null);

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the target Gruppo, creates Campionato + link inside a transaction", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(campionatoFindFirstMock).toHaveBeenCalledWith({
      where: { nome: { equals: "Serie D", mode: "insensitive" }, annoAgonisticoId: "anno-1" },
    });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txCampionatoCreateMock).toHaveBeenCalledWith({
      data: { nome: "Serie D", annoAgonisticoId: "anno-1" },
    });
    expect(txGruppoCampionatoCreateMock).toHaveBeenCalledWith({
      data: { gruppoId: "gruppo-1", campionatoId: "campionato-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });

  it("allows Admin without checking Gruppo ownership, but still validates the Gruppo exists in the current season (AC #3)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-qualunque" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("allows Dirigente without checking Gruppo ownership (AC #3)", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-qualunque" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("returns a validation error when a Campionato with the same name already exists this season (review fix, case-insensitive)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    campionatoFindFirstMock.mockResolvedValue({ id: "campionato-esistente" });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "serie d", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Esiste già un Campionato con questo nome in questa stagione - collegalo invece di crearne uno nuovo.",
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the transaction throws", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    transactionMock.mockRejectedValueOnce(new Error("db down"));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare il Campionato. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the authorization check itself throws", async () => {
    getUserMock.mockRejectedValue(new Error("auth down"));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("collegaCampionatoEsistente", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    getUserMock.mockReset();
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockReset();
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    allenatoreFindFirstMock.mockReset();
    gruppoAllenatoreFindUniqueMock.mockReset();
    campionatoFindUniqueMock.mockReset();
    campionatoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoCampionatoCreateMock.mockReset();
    gruppoCampionatoCreateMock.mockResolvedValue({});
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(gruppoCampionatoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when campionatoId is missing", async () => {
    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non specificato." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the target Gruppo", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoCampionatoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato belongs to a different season (review fix)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    campionatoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-vecchio" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non trovato per la stagione corrente." },
    });
    expect(gruppoCampionatoCreateMock).not.toHaveBeenCalled();
  });

  it("links an existing Campionato to the Gruppo (Admin, no ownership check)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(gruppoCampionatoCreateMock).toHaveBeenCalledWith({
      data: { gruppoId: "gruppo-1", campionatoId: "campionato-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });

  it("treats an already-existing link (P2002) as idempotent success", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoCampionatoCreateMock.mockRejectedValue({ code: "P2002" });

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, for a non-P2002 Prisma failure", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoCampionatoCreateMock.mockRejectedValue(new Error("db down"));

    const result = await collegaCampionatoEsistente(
      undefined,
      buildFormData({ gruppoId: "gruppo-1", campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile collegare il Campionato. Riprova." },
    });
  });
});

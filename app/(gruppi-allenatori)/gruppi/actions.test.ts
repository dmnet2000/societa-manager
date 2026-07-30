import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const gruppoCreateMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const gruppoAllenatoreCreateMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAtletaUpsertMock = vi.fn();
const gruppoAtletaDeleteManyMock = vi.fn();
const revalidatePathMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: { create: gruppoCreateMock, findUnique: gruppoFindUniqueMock },
    allenatore: { findFirst: allenatoreFindFirstMock },
    gruppoAllenatore: {
      create: gruppoAllenatoreCreateMock,
      findUnique: gruppoAllenatoreFindUniqueMock,
    },
    gruppoAtleta: { upsert: gruppoAtletaUpsertMock, deleteMany: gruppoAtletaDeleteManyMock },
  },
}));

// Story 9.15: assegnaAtleta/rimuoviAtleta ora chiamano risolviPossessoGruppo,
// che legge la sessione tramite createClient() - stesso pattern di mock gia'
// usato in app/(partite-campionati)/campionati/actions.test.ts.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaGruppo, assegnaAllenatore, assegnaAtleta, rimuoviAtleta } = await import(
  "./actions"
);

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
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  gruppoCreateMock.mockReset();
  gruppoFindUniqueMock.mockReset();
  gruppoAllenatoreCreateMock.mockReset();
  gruppoAllenatoreFindUniqueMock.mockReset();
  allenatoreFindFirstMock.mockReset();
  gruppoAtletaUpsertMock.mockReset();
  gruppoAtletaDeleteManyMock.mockReset();
  revalidatePathMock.mockReset();
  // Default: sessione ADMIN, cosi' i test gia' esistenti (scritti prima di
  // Story 9.15) che non configurano esplicitamente getUserMock continuano a
  // passare invariati - risolviPossessoGruppo si ferma al ramo ADMIN/
  // DIRIGENTE senza mai interrogare Allenatore/GruppoAllenatore.
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({
    data: { user: { id: "utente-admin", app_metadata: { ruoli: ["ADMIN"] } } },
    error: null,
  });
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
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
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

  // Story 9.15 (AC #1, #2): un Allenatore puo' assegnare Atlete solo al
  // proprio Gruppo (verificato tramite GruppoAllenatore), Admin/Dirigente
  // restano ad accesso ampio (AC #3, gia' coperto dai test sopra col
  // default ADMIN di getUserMock).
  it("allows an ALLENATORE who manages the Gruppo to assign an Atleta (AC #1)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ gruppoId: "g1", allenatoreId: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAllenatoreFindUniqueMock).toHaveBeenCalledWith({
      where: { gruppoId_allenatoreId: { gruppoId: "g1", allenatoreId: "all-1" } },
    });
    expect(gruppoAtletaUpsertMock).toHaveBeenCalled();
  });

  it("rejects (FORBIDDEN) an ALLENATORE who does not manage the Gruppo, no write (AC #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-2", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-2" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("rejects (FORBIDDEN) an ALLENATORE without a linked profile, no write (AC #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-senza-profilo", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  // Review fix (code review Story 9.15): GruppoAllenatore non viene mai
  // ripulita al cambio stagione - senza il confronto con l'Anno Agonistico
  // corrente, un Allenatore manterrebbe per sempre il possesso di un Gruppo
  // di una stagione passata.
  it("rejects (FORBIDDEN) an ALLENATORE whose Gruppo belongs to a past season, no write (review fix)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-3", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-3" });
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-corrente" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-vecchio" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL, no crash, when checking possesso throws (review fix)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-4", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockRejectedValue(new Error("db down"));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    });
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });
});

describe("rimuoviAtleta", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await rimuoviAtleta(undefined, buildFormData({ atletaId: "at1" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when atletaId is missing", async () => {
    const result = await rimuoviAtleta(undefined, buildFormData({ gruppoId: "g1" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });

  it("removes the assignment (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(gruppoAtletaDeleteManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", annoAgonisticoId: "anno-1", gruppoId: "g1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/gruppi");
    expect(result).toEqual({ success: true });
  });

  it("is idempotent: returns success even if the assignment no longer exists (count 0)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaDeleteManyMock.mockResolvedValue({ count: 0 });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, when the Gruppo lookup fails", async () => {
    gruppoFindUniqueMock.mockRejectedValue(new Error("db down"));

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile rimuovere l'Atleta. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the delete fails", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaDeleteManyMock.mockRejectedValue(new Error("db down"));

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile rimuovere l'Atleta. Riprova." },
    });
  });

  // Story 9.15 (AC #1, #2): stesso principio di assegnaAtleta - un
  // Allenatore puo' rimuovere Atlete solo dal proprio Gruppo.
  it("allows an ALLENATORE who manages the Gruppo to remove an Atleta (AC #1)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ gruppoId: "g1", allenatoreId: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAtletaDeleteManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", annoAgonisticoId: "anno-1", gruppoId: "g1" },
    });
  });

  it("rejects (FORBIDDEN) an ALLENATORE who does not manage the Gruppo, no write (AC #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-2", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-2" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });

  it("rejects (FORBIDDEN) an ALLENATORE without a linked profile, no write (AC #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-senza-profilo", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });

  // Review fix (code review Story 9.15): stesso principio di assegnaAtleta -
  // GruppoAllenatore non viene mai ripulita al cambio stagione.
  it("rejects (FORBIDDEN) an ALLENATORE whose Gruppo belongs to a past season, no write (review fix)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-3", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-3" });
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-corrente" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-vecchio" });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL, no crash, when checking possesso throws (review fix)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-4", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockRejectedValue(new Error("db down"));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    });
    expect(gruppoAtletaDeleteManyMock).not.toHaveBeenCalled();
  });
});

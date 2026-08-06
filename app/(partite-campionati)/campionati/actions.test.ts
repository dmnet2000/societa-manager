import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const campionatoFindFirstMock = vi.fn();
const campionatoCreateMock = vi.fn();
const campionatoFindUniqueMock = vi.fn();
const campionatoDeleteMock = vi.fn();
const campionatoUpdateMock = vi.fn();
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
    campionato: {
      findFirst: campionatoFindFirstMock,
      create: campionatoCreateMock,
      findUnique: campionatoFindUniqueMock,
      delete: campionatoDeleteMock,
      update: campionatoUpdateMock,
    },
  },
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaCampionato, cancellaCampionato, aggiornaCampionato } = await import("./actions");

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
    campionatoCreateMock.mockReset();
    campionatoCreateMock.mockResolvedValue({ id: "campionato-1" });
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the target Gruppo (AC #4 storia 10.1)", async () => {
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the target Gruppo, creates the Campionato with gruppoId directly (Story 10.7)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-1" })
    );

    expect(campionatoFindFirstMock).toHaveBeenCalledWith({
      where: {
        nome: { equals: "Serie D", mode: "insensitive" },
        annoAgonisticoId: "anno-1",
        gruppoId: "gruppo-1",
      },
    });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(campionatoCreateMock).toHaveBeenCalledWith({
      data: { nome: "Serie D", annoAgonisticoId: "anno-1", gruppoId: "gruppo-1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });

  it("allows Admin without checking Gruppo ownership, but still validates the Gruppo exists in the current season (AC #3 storia 10.1)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-qualunque" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(campionatoCreateMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("allows Dirigente without checking Gruppo ownership (AC #3 storia 10.1)", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Serie D", gruppoId: "gruppo-qualunque" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("returns a validation error when a Campionato with the same name already exists for this Gruppo this season (AC #4, case-insensitive)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    campionatoFindFirstMock.mockResolvedValue({ id: "campionato-esistente" });

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "serie d", gruppoId: "gruppo-1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Esiste già un Campionato con questo nome per questo Gruppo in questa stagione.",
      },
    });
    expect(campionatoCreateMock).not.toHaveBeenCalled();
  });

  it("allows two different Gruppi to create a Campionato with the same name in the same season (AC #3)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    // Il duplicato è scoped al Gruppo (AC #3/#4): nessun Campionato
    // omonimo esiste per QUESTO gruppoId, anche se un altro Gruppo ne ha
    // già uno con lo stesso nome nella stessa stagione (query is scoped by
    // gruppoId, quindi il mock semplicemente non trova nulla per questo
    // gruppoId).
    campionatoFindFirstMock.mockResolvedValue(null);

    const result = await creaCampionato(
      undefined,
      buildFormData({ nome: "Under 19", gruppoId: "gruppo-2" })
    );

    expect(campionatoFindFirstMock).toHaveBeenCalledWith({
      where: {
        nome: { equals: "Under 19", mode: "insensitive" },
        annoAgonisticoId: "anno-1",
        gruppoId: "gruppo-2",
      },
    });
    expect(campionatoCreateMock).toHaveBeenCalledWith({
      data: { nome: "Under 19", annoAgonisticoId: "anno-1", gruppoId: "gruppo-2" },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, when campionato.create throws", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    campionatoCreateMock.mockRejectedValueOnce(new Error("db down"));

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
    expect(campionatoCreateMock).not.toHaveBeenCalled();
  });
});

describe("cancellaCampionato", () => {
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
    campionatoFindUniqueMock.mockResolvedValue({ gruppoId: "gruppo-1" });
    campionatoDeleteMock.mockReset();
    campionatoDeleteMock.mockResolvedValue({});
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(campionatoDeleteMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when campionatoId is missing", async () => {
    const result = await cancellaCampionato(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non specificato." },
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato does not exist", async () => {
    campionatoFindUniqueMock.mockResolvedValue(null);

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-inesistente" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non trovato." },
    });
    expect(campionatoDeleteMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the Gruppo owning the Campionato", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(campionatoDeleteMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the Gruppo owning the Campionato to delete it", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(campionatoFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      select: { gruppoId: true },
    });
    expect(campionatoDeleteMock).toHaveBeenCalledWith({ where: { id: "campionato-1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to delete any Campionato without ownership check", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(campionatoDeleteMock).toHaveBeenCalledWith({ where: { id: "campionato-1" } });
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to delete a Campionato of a Gruppo from a past season (review fix)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ADMIN"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(campionatoDeleteMock).toHaveBeenCalledWith({ where: { id: "campionato-1" } });
    expect(result).toEqual({ success: true });
  });

  it("still refuses an Allenatore trying to delete a Campionato of a Gruppo from a past season", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(campionatoDeleteMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when campionato.delete throws", async () => {
    campionatoDeleteMock.mockRejectedValueOnce(new Error("db down"));

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare il Campionato. Riprova." },
    });
  });

  it("treats a concurrent double-delete (Prisma P2025) as idempotent success (review fix)", async () => {
    campionatoDeleteMock.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" })
    );

    const result = await cancellaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1" })
    );

    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });
});

// Story 10.8: stesso schema di casi di cancellaCampionato sopra (stesso
// perimetro di autorizzazione, risolviAutorizzazioneGruppo con
// permettiStagionePassata: true), piu' i casi specifici di validazione
// nome/linkFipav.
describe("aggiornaCampionato", () => {
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
    campionatoFindUniqueMock.mockResolvedValue({
      gruppoId: "gruppo-1",
      annoAgonisticoId: "anno-1",
    });
    campionatoFindFirstMock.mockReset();
    campionatoFindFirstMock.mockResolvedValue(null);
    campionatoUpdateMock.mockReset();
    campionatoUpdateMock.mockResolvedValue({});
    trovaAnnoAgonisticoCorrenteMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(ANNO_CORRENTE);
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and touches nothing when the caller lacks the required Ruolo", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when campionatoId is missing", async () => {
    const result = await aggiornaCampionato(undefined, buildFormData({ nome: "Girone A" }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non specificato." },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is empty (AC #2)", async () => {
    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "  " })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Campionato è obbligatorio." },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Campionato does not exist", async () => {
    campionatoFindUniqueMock.mockResolvedValue(null);

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-inesistente", nome: "Girone A" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non trovato." },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses an Allenatore who does not coach the Gruppo owning the Campionato", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("allows an Allenatore who coaches the Gruppo owning the Campionato to update it, trimming nome and saving linkFipav (AC #1)", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    allenatoreFindFirstMock.mockResolvedValue({ id: "allenatore-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ id: "ga-1" });

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({
        campionatoId: "campionato-1",
        nome: "  Girone A  ",
        linkFipav: "https://www.federvolley.it/girone-a",
      })
    );

    expect(campionatoUpdateMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      data: { nome: "Girone A", linkFipav: "https://www.federvolley.it/girone-a" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/campionati");
    expect(result).toEqual({ success: true });
  });

  it("saves linkFipav as null when left empty (AC #3, clears an existing link)", async () => {
    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A", linkFipav: "  " })
    );

    expect(campionatoUpdateMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      data: { nome: "Girone A", linkFipav: null },
    });
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to update any Campionato without ownership check", async () => {
    getUserMock.mockResolvedValue(buildUser(["DIRIGENTE"]));

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(campionatoUpdateMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      data: { nome: "Girone A", linkFipav: null },
    });
    expect(result).toEqual({ success: true });
  });

  it("allows Admin/Dirigente to update a Campionato of a Gruppo from a past season (AC #4, same as cancellaCampionato)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(campionatoUpdateMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("still refuses an Allenatore trying to update a Campionato of a Gruppo from a past season", async () => {
    getUserMock.mockResolvedValue(buildUser(["ALLENATORE"]));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-passato" });

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato per la stagione corrente." },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when campionato.update throws", async () => {
    campionatoUpdateMock.mockRejectedValueOnce(new Error("db down"));

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare il Campionato. Riprova." },
    });
  });

  // Review fix (Blind Hunter + Edge Case Hunter): nessuna validazione
  // server-side su linkFipav permetteva uno schema javascript:/data: reso
  // poi come href cliccabile - stesso rischio gia' evitato per il link Maps
  // di Palestra.
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "www.federvolley.it/girone-a",
    "non-e-un-link",
  ])("rejects an unsafe or protocol-less linkFipav value: %s", async (valore) => {
    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A", linkFipav: valore })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il link al portale FIPAV non è valido (deve iniziare con http:// o https://).",
      },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("accepts a well-formed https linkFipav value", async () => {
    const result = await aggiornaCampionato(
      undefined,
      buildFormData({
        campionatoId: "campionato-1",
        nome: "Girone A",
        linkFipav: "https://www.federvolley.it/girone-a",
      })
    );

    expect(result).toEqual({ success: true });
  });

  // Review fix (Blind Hunter + Edge Case Hunter): creaCampionato blocca un
  // nome duplicato per lo stesso Gruppo/stagione, aggiornaCampionato non lo
  // faceva - rinominare poteva far collidere silenziosamente due Campionati.
  it("rejects a rename that would collide with a sibling Campionato in the same Gruppo/season", async () => {
    campionatoFindFirstMock.mockResolvedValue({ id: "campionato-2" });

    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(campionatoFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: { not: "campionato-1" },
        nome: { equals: "Girone A", mode: "insensitive" },
        annoAgonisticoId: "anno-1",
        gruppoId: "gruppo-1",
      },
    });
    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Esiste già un Campionato con questo nome per questo Gruppo in questa stagione.",
      },
    });
    expect(campionatoUpdateMock).not.toHaveBeenCalled();
  });

  it("allows keeping the Campionato's own unchanged name (excluded from the duplicate check)", async () => {
    const result = await aggiornaCampionato(
      undefined,
      buildFormData({ campionatoId: "campionato-1", nome: "Girone A" })
    );

    expect(campionatoFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "campionato-1" } }) })
    );
    expect(result).toEqual({ success: true });
  });
});

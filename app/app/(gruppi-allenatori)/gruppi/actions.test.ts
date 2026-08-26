import { describe, expect, it, vi, beforeEach } from "vitest";

// Story 18.4: actions.ts importa lib/storage/validazione-immagine.ts e
// lib/storage/foto-squadra.ts, entrambe con "server-only" in testa - stesso
// mock gia' stabilito in lib/storage/logo.test.ts / sponsor/actions.test.ts.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const gruppoCreateMock = vi.fn();
const gruppoUpdateMock = vi.fn();
const gruppoFindUniqueMock = vi.fn();
const gruppoAggregateMock = vi.fn();
const gruppoAllenatoreCreateMock = vi.fn();
const gruppoAllenatoreFindUniqueMock = vi.fn();
const gruppoAllenatoreDeleteManyMock = vi.fn();
const allenatoreFindFirstMock = vi.fn();
const gruppoAtletaUpsertMock = vi.fn();
const gruppoAtletaDeleteManyMock = vi.fn();
const gruppoAtletaUpdateManyMock = vi.fn();
const revalidatePathMock = vi.fn();
const getUserMock = vi.fn();
const creaAtletaMock = vi.fn();
const creaNotificaMock = vi.fn();
// Review fix (code review Story 9.18): il controllo Codice Fiscale duplicato
// in creaEAssegnaAtleta usa il client supabase (RLS, AD-9), non piu'
// prisma.atleta.findUnique - mockato qui come .from("atlete")...maybeSingle().
const atletaMaybeSingleMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: {
      create: gruppoCreateMock,
      update: gruppoUpdateMock,
      findUnique: gruppoFindUniqueMock,
      aggregate: gruppoAggregateMock,
    },
    allenatore: { findFirst: allenatoreFindFirstMock },
    gruppoAllenatore: {
      create: gruppoAllenatoreCreateMock,
      findUnique: gruppoAllenatoreFindUniqueMock,
      deleteMany: gruppoAllenatoreDeleteManyMock,
    },
    gruppoAtleta: {
      upsert: gruppoAtletaUpsertMock,
      deleteMany: gruppoAtletaDeleteManyMock,
      updateMany: gruppoAtletaUpdateManyMock,
    },
  },
}));

// Story 9.18: creaEAssegnaAtleta riusa creaAtleta/creaNotifica condivise -
// mockate qui come funzioni intere (non i dettagli interni supabase-js di
// quei moduli, gia' testati per conto proprio in lib/db-rls/*.test.ts).
vi.mock("@/lib/db-rls/atleta", () => ({
  creaAtleta: creaAtletaMock,
}));

vi.mock("@/lib/db-rls/notifica", () => ({
  creaNotifica: creaNotificaMock,
}));

// Story 18.4: caricaFotoSquadraAction riusa caricaFotoSquadra - mockata qui
// come funzione intera (gia' testata per conto proprio in
// lib/storage/foto-squadra.test.ts), stesso principio di creaAtleta/
// creaNotifica sopra.
const caricaFotoSquadraMock = vi.fn();
vi.mock("@/lib/storage/foto-squadra", () => ({
  caricaFotoSquadra: caricaFotoSquadraMock,
}));

// Story 9.15: assegnaAtleta/rimuoviAtleta ora chiamano risolviPossessoGruppo,
// che legge la sessione tramite createClient() - stesso pattern di mock gia'
// usato in app/(partite-campionati)/campionati/actions.test.ts.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: atletaMaybeSingleMock,
        }),
      }),
    }),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  creaGruppo,
  aggiornaGruppoAction,
  assegnaAllenatore,
  rimuoviAllenatore,
  assegnaAtleta,
  rimuoviAtleta,
  impostaNumeroAtletaAction,
  creaEAssegnaAtleta,
  caricaFotoSquadraAction,
} = await import("./actions");

function buildFormData(fields: Record<string, string>, file?: File | null) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) formData.append("file", file);
  return formData;
}

// Story 18.4: bytes reali con magic-byte corretto - validaImmagineFotoSquadra
// (contenutoCorrispondeAlMimeImmagine) non e' mockata, gira per davvero,
// stesso principio gia' stabilito in sponsor/actions.test.ts.
const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileValido(nome = "squadra.png", tipo = "image/png", dimensione = 1024) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  risolviAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  gruppoCreateMock.mockReset();
  gruppoFindUniqueMock.mockReset();
  gruppoAggregateMock.mockReset();
  gruppoAggregateMock.mockResolvedValue({ _max: { ordine: null } });
  gruppoAllenatoreCreateMock.mockReset();
  gruppoAllenatoreFindUniqueMock.mockReset();
  gruppoAllenatoreDeleteManyMock.mockReset();
  allenatoreFindFirstMock.mockReset();
  gruppoAtletaUpsertMock.mockReset();
  gruppoAtletaDeleteManyMock.mockReset();
  gruppoAtletaUpdateManyMock.mockReset();
  atletaMaybeSingleMock.mockReset();
  creaAtletaMock.mockReset();
  creaNotificaMock.mockReset();
  caricaFotoSquadraMock.mockReset();
  caricaFotoSquadraMock.mockResolvedValue(undefined);
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
    gruppoAggregateMock.mockResolvedValue({ _max: { ordine: null } });
    gruppoCreateMock.mockResolvedValue({ id: "g1" });

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({ success: true });
    expect(risolviAnnoAgonisticoCorrenteMock).toHaveBeenCalled();
    expect(gruppoCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Under 13",
        categoria: "Under 13",
        annoAgonisticoId: "anno-1",
        ordine: 0,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
  });

  // Story 19.15 (Epic 19, Ruolo Site Manager): ordine = max esistente + 1
  // TRA I GRUPPI DELLA STESSA STAGIONE (non un contatore globale) - mirror
  // di creaVoceMenuPubblico in lib/menu-pubblico.ts.
  it("assigns ordine = max esistente + 1 tra i Gruppi della stessa stagione (Story 19.15)", async () => {
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoAggregateMock.mockResolvedValue({ _max: { ordine: 4 } });
    gruppoCreateMock.mockResolvedValue({ id: "g1" });

    const result = await creaGruppo(
      undefined,
      buildFormData({ nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAggregateMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1" },
      _max: { ordine: true },
    });
    expect(gruppoCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Under 13",
        categoria: "Under 13",
        annoAgonisticoId: "anno-1",
        ordine: 5,
      },
    });
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

describe("aggiornaGruppoAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(gruppoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when id is missing", async () => {
    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "", nome: "Under 13", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing", async () => {
    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "  ", categoria: "Under 13" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Gruppo è obbligatorio." },
    });
    expect(gruppoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming the categoria, not the nome, when categoria is missing", async () => {
    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "Under 13", categoria: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La categoria del Gruppo è obbligatoria." },
    });
    expect(gruppoUpdateMock).not.toHaveBeenCalled();
  });

  it("updates nome/categoria and revalidates /app/gruppi, /app/i-miei-gruppi and /app/foto-squadre (AC #1)", async () => {
    gruppoUpdateMock.mockResolvedValue({ id: "g1" });

    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "Under 14", categoria: "Under 14" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoUpdateMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { nome: "Under 14", categoria: "Under 14" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
    // Review fix (Verification Gap Reviewer): /app/foto-squadre mostra
    // anche nome/categoria di ogni Gruppo, stesso motivo gia' documentato
    // per caricaFotoSquadraAction.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/foto-squadre");
  });

  it("trims nome/categoria before persisting", async () => {
    gruppoUpdateMock.mockResolvedValue({ id: "g1" });

    await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "  Under 14  ", categoria: "  Under 14  " })
    );

    expect(gruppoUpdateMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { nome: "Under 14", categoria: "Under 14" },
    });
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    gruppoUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g1", nome: "Under 14", categoria: "Under 14" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare il Gruppo. Riprova." },
    });
  });

  it("returns a dedicated 'not found' message, no generic retry, when the Gruppo no longer exists (Prisma P2025)", async () => {
    gruppoUpdateMock.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));

    const result = await aggiornaGruppoAction(
      undefined,
      buildFormData({ id: "g-cancellato", nome: "Under 14", categoria: "Under 14" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
  });

  it("treats a unique constraint violation (P2002) as idempotent success (AC #3)", async () => {
    gruppoAllenatoreCreateMock.mockRejectedValue({ code: "P2002" });

    const result = await assegnaAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
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

// Story 9.32: stesso perimetro/stile di assegnaAllenatore sopra (nessuna
// risoluzione annoAgonisticoId/risolviPossessoGruppo - a differenza di
// rimuoviAtleta, qui il perimetro resta Admin/Dirigente-only).
describe("rimuoviAllenatore", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(gruppoAllenatoreDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming gruppoId when it is missing", async () => {
    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "", allenatoreId: "a1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoAllenatoreDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming allenatoreId when it is missing", async () => {
    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Allenatore non specificato." },
    });
    expect(gruppoAllenatoreDeleteManyMock).not.toHaveBeenCalled();
  });

  it("removes the Allenatore from the Gruppo and revalidates both /gruppi and /i-miei-gruppi (AC #1, #2)", async () => {
    gruppoAllenatoreDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAllenatoreDeleteManyMock).toHaveBeenCalledWith({
      where: { gruppoId: "g1", allenatoreId: "a1" },
    });
    // Review fix: /i-miei-gruppi calcola i Gruppi propri di un Allenatore
    // filtrando su GruppoAllenatore - senza questa revalidazione resterebbe
    // con dati non aggiornati (stesso bug gia' corretto per assegnaAtleta/
    // rimuoviAtleta, Story 9.15).
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
  });

  it("is idempotent: removing an already-removed assignment does not error (AC #3)", async () => {
    gruppoAllenatoreDeleteManyMock.mockResolvedValue({ count: 0 });

    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({ success: true });
  });

  it("returns a friendly error, no crash, on a Prisma failure", async () => {
    gruppoAllenatoreDeleteManyMock.mockRejectedValue(new Error("db down"));

    const result = await rimuoviAllenatore(
      undefined,
      buildFormData({ gruppoId: "g1", allenatoreId: "a1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile rimuovere l'Allenatore. Riprova." },
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

  it("upserts on (atletaId, gruppoId, annoAgonisticoId) using the Gruppo's own season (Story 9.21, AC #1, #2, #3)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat1" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAtletaUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_gruppoId_annoAgonisticoId: {
          atletaId: "at1",
          gruppoId: "g1",
          annoAgonisticoId: "anno-1",
        },
      },
      create: { atletaId: "at1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      update: { gruppoId: "g1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
  });

  // Story 9.21 (AC #1): decisione esplicita dell'utente - assegnaAtleta non
  // "sposta" piu' nulla, e' sempre additiva. La chiave composita include ora
  // gruppoId: assegnare un'Atleta gia' in un altro Gruppo della stessa
  // stagione crea una SECONDA riga (chiave diversa, gruppoId diverso), senza
  // toccare/cancellare la prima - verificato controllando che l'upsert usi
  // esattamente la chiave del nuovo Gruppo, mai quella del vecchio.
  it("assigning an Atleta already in a different Gruppo adds her there too, without touching the other assignment (Story 9.21, AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat2" });

    const result = await assegnaAtleta(
      undefined,
      buildFormData({ gruppoId: "g2", atletaId: "at1" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAtletaUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_gruppoId_annoAgonisticoId: {
          atletaId: "at1",
          gruppoId: "g2",
          annoAgonisticoId: "anno-1",
        },
      },
      create: { atletaId: "at1", gruppoId: "g2", annoAgonisticoId: "anno-1" },
      update: { gruppoId: "g2" },
    });
    // Un solo upsert, mai un delete/update sulla riga del Gruppo precedente
    // (nessun mock di delete esiste per gruppoAtleta in questo file - se il
    // codice provasse a chiamarlo, il test fallirebbe con un errore di
    // funzione non definita, non silenziosamente).
    expect(gruppoAtletaUpsertMock).toHaveBeenCalledTimes(1);
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(result).toEqual({ success: true });
  });

  // Story 9.21 (AC #3, review fix): scenario esplicitamente citato dall'AC -
  // un'Atleta in due Gruppi, rimossa da uno solo, deve restare assegnata
  // all'altro. deleteMany e' gia' scoped su gruppoId (verificato per
  // lettura, non solo assunto): il where composito qui sotto non puo'
  // toccare la riga dell'altro Gruppo, che ha un gruppoId diverso.
  it("removes only from the specified Gruppo, leaving the Atleta's other Gruppo assignment untouched (Story 9.21, AC #3)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaDeleteManyMock.mockResolvedValue({ count: 1 });

    const result = await rimuoviAtleta(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1" })
    );

    expect(gruppoAtletaDeleteManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", annoAgonisticoId: "anno-1", gruppoId: "g1" },
    });
    // Un solo delete, scoped esattamente su g1 - non un delete generico su
    // (atletaId, annoAgonisticoId) che avrebbe cancellato anche la riga di
    // un eventuale secondo Gruppo (es. "g2").
    expect(gruppoAtletaDeleteManyMock).toHaveBeenCalledTimes(1);
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

describe("impostaNumeroAtletaAction", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Allenatore", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when atletaId is missing", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numero is not an integer", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "abc" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Numero deve essere un intero tra 1 e 999." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when numero is below the minimum", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "0" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Numero deve essere un intero tra 1 e 999." },
    });
  });

  it("returns a validation error when numero is above the maximum", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "1000" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Numero deve essere un intero tra 1 e 999." },
    });
  });

  it("returns a validation error when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  it("sets the numero (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(gruppoAtletaUpdateManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      data: { numero: 7 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
    expect(result).toEqual({ success: true });
  });

  it("clears the numero to null when the field is left empty (AC #2)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "" })
    );

    expect(gruppoAtletaUpdateManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      data: { numero: null },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns a validation error, not a silent no-op, when the assignment no longer exists (count 0)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpdateManyMock.mockResolvedValue({ count: 0 });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Assegnazione non trovata." },
    });
    // Review fix (Blind Hunter): senza revalidatePath anche su questo ramo,
    // la riga restava visibile/modificabile nella UI stantia nonostante
    // l'assegnazione non esista piu' lato server.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
  });

  it("returns a friendly error, no crash, when the Gruppo lookup fails", async () => {
    gruppoFindUniqueMock.mockRejectedValue(new Error("db down"));

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile impostare il Numero. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpdateManyMock.mockRejectedValue(new Error("db down"));

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile impostare il Numero. Riprova." },
    });
  });

  // Story 9.35 (stesso principio di rimuoviAtleta, Story 9.15): un
  // Allenatore puo' impostare il Numero solo per Atlete del proprio Gruppo.
  it("allows an ALLENATORE who manages the Gruppo to set the numero", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ gruppoId: "g1", allenatoreId: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAtletaUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({ success: true });
    expect(gruppoAtletaUpdateManyMock).toHaveBeenCalledWith({
      where: { atletaId: "at1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      data: { numero: 7 },
    });
  });

  it("rejects (FORBIDDEN) an ALLENATORE who does not manage the Gruppo, no write", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-2", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-2" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): parita' di test mancante con rimuoviAtleta -
  // gli stessi 3 rami di risolviPossessoGruppo erano gia' testati li' ma non
  // ancora replicati qui, nonostante la spec dichiari "mirror esatto".
  it("rejects (FORBIDDEN) an ALLENATORE without a linked profile, no write", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-senza-profilo", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  it("rejects (FORBIDDEN) an ALLENATORE whose Gruppo belongs to a past season, no write", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-3", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-3" });
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-corrente" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-vecchio" });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(gruppoAllenatoreFindUniqueMock).not.toHaveBeenCalled();
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL, no crash, when checking possesso throws", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-4", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockRejectedValue(new Error("db down"));
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    });
    expect(gruppoAtletaUpdateManyMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): il solo test "non e' un intero" esistente
  // passava una stringa non numerica ("abc", NaN) - mai un vero decimale.
  it("returns a validation error when numero is a real decimal, not just a non-numeric string", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "7.5" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Numero deve essere un intero tra 1 e 999." },
    });
    expect(gruppoFindUniqueMock).not.toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter + Blind Hunter): Number("1e2")/Number("0x7")
  // sono interi "validi" per Number.isInteger ma non sono cifre decimali
  // semplici - mai digitabili dal widget <input type="number"> reale, solo
  // tramite un FormData manomesso.
  it("returns a validation error for scientific/hex notation, even though it parses to a valid integer", async () => {
    const result = await impostaNumeroAtletaAction(
      undefined,
      buildFormData({ gruppoId: "g1", atletaId: "at1", numero: "1e2" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Numero deve essere un intero tra 1 e 999." },
    });
  });
});

describe("creaEAssegnaAtleta", () => {
  // "RSSMRA85M01H501U" decodifica giorno 01 -> M; "...M41..." -> F (Story 9.18).
  const campiValidi = {
    gruppoId: "g1",
    cognome: "Rossi",
    nome: "Maria",
    dataNascita: "2012-05-01",
    codiceFiscale: "RSSMRA85M01H501U",
  };

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Allenatore", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when gruppoId is missing", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, gruppoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when cognome is missing", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, cognome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il cognome è obbligatorio." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when dataNascita is missing", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, dataNascita: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La data di nascita è obbligatoria." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when codiceFiscale is missing", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, codiceFiscale: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il codice fiscale è obbligatorio." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when codiceFiscale format is invalid", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, codiceFiscale: "troppo-corto" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Codice fiscale non valido." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the sesso cannot be derived from codiceFiscale (review: giorno fuori range)", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, codiceFiscale: "RSSMRA85M99H501U" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile determinare il sesso dal codice fiscale inserito. Verifica il codice fiscale.",
      },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("rejects (FORBIDDEN) an ALLENATORE who does not manage the Gruppo, no write (AC #4)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when codiceFiscale already belongs to an existing Atleta (AC #2)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: { id: "atleta-esistente" }, error: null });

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Esiste già un'Atleta con questo Codice Fiscale." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  it("creates, assigns and notifies on success (AC #1, #3)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-1");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat1" });
    creaNotificaMock.mockResolvedValue(undefined);

    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, email: "maria@example.com", cellulare: "3331234567" })
    );

    expect(result).toEqual({ success: true });
    expect(creaAtletaMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        codiceFiscale: "RSSMRA85M01H501U",
        // Story 9.36: cognome/nome sanificati in maiuscolo prima della
        // concatenazione, stessa convenzione gia' in uso per codiceFiscale.
        nome: "ROSSI MARIA",
        sesso: "M",
        email: "maria@example.com",
        cellulare: "3331234567",
      })
    );
    expect(gruppoAtletaUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_gruppoId_annoAgonisticoId: {
          atletaId: "nuova-atleta-1",
          gruppoId: "g1",
          annoAgonisticoId: "anno-1",
        },
      },
      create: { atletaId: "nuova-atleta-1", gruppoId: "g1", annoAgonisticoId: "anno-1" },
      update: { gruppoId: "g1" },
    });
    expect(creaNotificaMock).toHaveBeenCalledWith(
      expect.anything(),
      "nuova-atleta-1",
      "NUOVO_ATLETA"
    );
    // Review fix (code review Story 9.18): ADMIN/DIRIGENTE possono chiamare
    // questa action e vedono anche /gruppi, non solo /i-miei-gruppi.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
  });

  it("leaves cognome/nome unchanged when already fully uppercase (Story 9.36 AC #2)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-gia-maiuscola");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat-gia-maiuscola" });
    creaNotificaMock.mockResolvedValue(undefined);

    await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, cognome: "ROSSI", nome: "MARIA" })
    );

    expect(creaAtletaMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ nome: "ROSSI MARIA" })
    );
  });

  it("uppercases accented/extended letters without errors (Story 9.36)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-accenti");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat-accenti" });
    creaNotificaMock.mockResolvedValue(undefined);

    await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, cognome: "città", nome: "José" })
    );

    expect(creaAtletaMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ nome: "CITTÀ JOSÉ" })
    );
  });

  it("treats email/cellulare as null when omitted (comportamento opzionale)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-2");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat2" });
    creaNotificaMock.mockResolvedValue(undefined);

    await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(creaAtletaMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: null, cellulare: null })
    );
  });

  it("returns INTERNAL, no crash, when creaAtleta fails, no assignment attempted", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockRejectedValue(new Error("db down"));

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare l'Atleta. Riprova." },
    });
    expect(gruppoAtletaUpsertMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL when assignment fails after a successful creation", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-3");
    gruppoAtletaUpsertMock.mockRejectedValue(new Error("db down"));

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare la nuova Atleta al Gruppo. Riprova." },
    });
  });

  it("does not fail the action when creaNotifica fails (non-blocking side effect, same pattern as certificato-medico)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-4");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat4" });
    creaNotificaMock.mockRejectedValue(new Error("notifica fallita"));

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ success: true });
  });

  it("returns a validation error when dataNascita cannot be parsed (review: bypass del widget date)", async () => {
    const result = await creaEAssegnaAtleta(
      undefined,
      buildFormData({ ...campiValidi, dataNascita: "non-una-data" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Data di nascita non valida." },
    });
    expect(creaAtletaMock).not.toHaveBeenCalled();
  });

  // Review fix (code review Story 9.18): nessun test precedente esercitava il
  // percorso di successo con un vero attore ALLENATORE proprietario del
  // Gruppo - tutti giravano sotto la sessione ADMIN di default (beforeEach).
  it("creates, assigns and notifies on success for an ALLENATORE who owns the Gruppo (AC #1, #4)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ gruppoId: "g1", allenatoreId: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    atletaMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    creaAtletaMock.mockResolvedValue("nuova-atleta-5");
    gruppoAtletaUpsertMock.mockResolvedValue({ id: "gat5" });
    creaNotificaMock.mockResolvedValue(undefined);

    const result = await creaEAssegnaAtleta(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ success: true });
    expect(creaAtletaMock).toHaveBeenCalled();
  });
});

describe("caricaFotoSquadraAction", () => {
  // Story 19.4 (Epic 19): SITE_MANAGER aggiunto alla lista Ruoli ammessi -
  // additivo, ADMIN/DIRIGENTE/ALLENATORE restano invariati.
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente/Allenatore/SiteManager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith([
      "ADMIN",
      "DIRIGENTE",
      "ALLENATORE",
      "SITE_MANAGER",
    ]);
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when gruppoId is missing", async () => {
    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({}, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non specificato." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  // Review fix: risolviPossessoGruppo ora gira PRIMA della validazione
  // immagine (vedi actions.ts) - questi tre test devono quindi configurare
  // un Gruppo risolvibile, altrimenti fallirebbero prima con "Gruppo non
  // trovato" invece di esercitare il ramo di validazione che intendono
  // testare.
  it("returns VALIDATION when no file is selected (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION for a disallowed MIME type (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido("squadra.gif", "image/gif"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when file content doesn't match the declared MIME type (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    const fileConMimeFinto = new File([new Uint8Array([0, 0, 0, 0])], "squadra.png", {
      type: "image/png",
    });

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileConMimeFinto)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  // AC #1: dimensione massima 2MB - unico ramo di validaImmagineFotoSquadra
  // non ancora coperto (review fix, Blind Hunter).
  it("returns VALIDATION when the file exceeds the 2MB size limit (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    const fileTroppoGrande = fileValido("squadra.png", "image/png", 2 * 1024 * 1024 + 1);

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileTroppoGrande)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  // Review fix (Blind Hunter): stesso ramo gia' testato per assegnaAtleta/
  // rimuoviAtleta (righe 464/781) - mancava qui.
  it("returns INTERNAL when the Gruppo lookup throws", async () => {
    gruppoFindUniqueMock.mockRejectedValue(new Error("connection lost"));

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare la foto di squadra. Riprova." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when the Gruppo does not exist", async () => {
    gruppoFindUniqueMock.mockResolvedValue(null);

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  // AC #2: un Allenatore non assegnato al Gruppo non puo' caricarne la foto -
  // stesso identico ramo di autorizzazione gia' testato per assegnaAtleta.
  it("returns FORBIDDEN when an ALLENATORE is not assigned to the Gruppo (AC #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue(null);

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non gestisci questo Gruppo." },
    });
    expect(caricaFotoSquadraMock).not.toHaveBeenCalled();
  });

  it("uploads and revalidates all three pages on success for Admin/Dirigente (AC #1)", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const file = fileValido();
    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, file)
    );

    expect(result).toEqual({ success: true });
    expect(caricaFotoSquadraMock).toHaveBeenCalledWith(expect.anything(), "g1", file);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
    // Story 19.4: terza revalidatePath - /app/foto-squadre mostra lo stesso
    // stato foto per Site Manager.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/foto-squadre");
  });

  it("uploads on success for an ALLENATORE who owns the Gruppo (AC #1, #2)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-all-1", app_metadata: { ruoli: ["ALLENATORE"] } } },
      error: null,
    });
    allenatoreFindFirstMock.mockResolvedValue({ id: "all-1" });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    gruppoAllenatoreFindUniqueMock.mockResolvedValue({ gruppoId: "g1", allenatoreId: "all-1" });

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({ success: true });
    expect(caricaFotoSquadraMock).toHaveBeenCalled();
  });

  // Story 19.4 (Epic 19, Ruolo Site Manager): un Site Manager tipicamente non
  // ha nessuna riga Allenatore propria (allenatoreFindFirstMock non
  // configurato qui - resta undefined/non chiamato per costruzione, dato che
  // risolviPossessoGruppo si ferma al ramo SITE_MANAGER prima di interrogare
  // Allenatore) - l'upload deve comunque riuscire su un Gruppo qualunque,
  // nessun controllo di ownership (come Admin), a differenza del ramo
  // ALLENATORE sopra.
  it("uploads on success for a SITE_MANAGER with no Allenatore row of their own, on any Gruppo (AC #1)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "utente-sm-1", app_metadata: { ruoli: ["SITE_MANAGER"] } } },
      error: null,
    });
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });

    const file = fileValido();
    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, file)
    );

    expect(result).toEqual({ success: true });
    expect(caricaFotoSquadraMock).toHaveBeenCalledWith(expect.anything(), "g1", file);
    expect(allenatoreFindFirstMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/foto-squadre");
  });

  it("returns INTERNAL when the upload fails", async () => {
    gruppoFindUniqueMock.mockResolvedValue({ annoAgonisticoId: "anno-1" });
    caricaFotoSquadraMock.mockRejectedValue(new Error("storage down"));

    const result = await caricaFotoSquadraAction(
      undefined,
      buildFormData({ gruppoId: "g1" }, fileValido())
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare la foto di squadra. Riprova." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

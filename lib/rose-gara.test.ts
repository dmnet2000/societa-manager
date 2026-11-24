import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();
const leggiRosaMock = vi.fn();
const salvaRosaMock = vi.fn();
const leggiParametriMock = vi.fn();
const leggiParametriSquadraMock = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: { partitaTorneo: { findUnique: findUniqueMock } } }));
vi.mock("@/lib/parametri-formato", () => ({
  leggiParametriGara: leggiParametriMock,
  leggiParametriSquadra: leggiParametriSquadraMock,
}));
vi.mock("@/lib/db-rls/rosa", async (importOriginal) => {
  const originale = await importOriginal<typeof import("@/lib/db-rls/rosa")>();
  return { ...originale, leggiRosa: leggiRosaMock, salvaRosa: salvaRosaMock };
});

const { leggiRoseGara, salvaRosaGara, salvaRosaSquadra } = await import("./rose-gara");
const { RosaValidationError } = await import("@/lib/db-rls/rosa");

const supabase = { marker: "supabase" } as never;
const PARAMETRI = { liberiMin: 1, liberiMax: 2, rosaMax: 14 };
const ID = "123e4567-e89b-42d3-a456-426614174000";

function giocatore(numero: number, libero = false) {
  return { numero, nome: "A", cognome: "B", capitano: false, libero };
}

describe("leggiRoseGara", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue({ squadraCasaId: "sc", squadraOspiteId: "so" });
  });

  it("rosa assente = versione 0 e liste vuote", async () => {
    const rosa = { versione: 2, giocatori: [{ id: "g" }], tesserati: [] };
    leggiRosaMock.mockImplementation(async (_s, id) => (id === "sc" ? rosa : null));

    const esito = await leggiRoseGara(supabase, "p-1");

    expect(esito.casa).toBe(rosa);
    expect(esito.ospite).toEqual({ versione: 0, giocatori: [], tesserati: [] });
    expect(leggiRosaMock).toHaveBeenCalledWith(supabase, "sc");
    expect(leggiRosaMock).toHaveBeenCalledWith(supabase, "so");
  });

  it("lancia se la gara non esiste", async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(leggiRoseGara(supabase, "x")).rejects.toThrow();
  });
});

describe("salvaRosaGara", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue({ squadraCasaId: "sc", squadraOspiteId: "so" });
    leggiParametriMock.mockResolvedValue(PARAMETRI);
    salvaRosaMock.mockResolvedValue({ esito: "ok", versione: 3 });
  });

  const base = { garaId: "p-1", versioneBase: 2, idModifica: ID, tesserati: [{ ruolo: "A" as const, nome: "L" }] };

  it("salva sulla squadra del lato", async () => {
    const giocatori = [giocatore(1), giocatore(2, true)];

    await expect(salvaRosaGara(supabase, { ...base, lato: "ospite", giocatori })).resolves.toEqual({
      esito: "ok",
      versione: 3,
    });
    expect(salvaRosaMock).toHaveBeenCalledWith(supabase, "so", 2, ID, giocatori, base.tesserati);
  });

  it("restituisce il conflitto come valore", async () => {
    salvaRosaMock.mockResolvedValue({ esito: "conflitto", versione: 5 });
    await expect(
      salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: [giocatore(1, true)] })
    ).resolves.toEqual({ esito: "conflitto", versione: 5 });
  });

  it("senza libero: validazione, nulla salvato", async () => {
    const promessa = salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: [giocatore(1)] });
    await expect(promessa).rejects.toBeInstanceOf(RosaValidationError);
    expect(salvaRosaMock).not.toHaveBeenCalled();
  });

  it("ripetizione dello stesso idModifica: la stessa versione passa invariata", async () => {
    salvaRosaMock.mockResolvedValue({ esito: "ok", versione: 2 });
    await expect(
      salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: [giocatore(1, true)] })
    ).resolves.toEqual({ esito: "ok", versione: 2 });
  });

  it("messaggio al singolare con un solo libero richiesto", async () => {
    leggiParametriMock.mockResolvedValue({ liberiMin: 1, liberiMax: 1, rosaMax: 14 });
    await expect(
      salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: [giocatore(1)] })
    ).rejects.toThrow("La rosa deve avere un libero.");
  });

  it("numero di maglia doppio o due capitani: validazione, nulla salvato", async () => {
    const doppio = [giocatore(1, true), giocatore(1)];
    await expect(salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: doppio })).rejects.toThrow(
      /stesso numero/
    );
    const capitani = [
      { ...giocatore(1, true), capitano: true },
      { ...giocatore(2), capitano: true },
    ];
    await expect(salvaRosaGara(supabase, { ...base, lato: "casa", giocatori: capitani })).rejects.toThrow(
      /un solo capitano/
    );
    expect(salvaRosaMock).not.toHaveBeenCalled();
  });

  it("troppi liberi", async () => {
    const giocatori = [giocatore(1, true), giocatore(2, true), giocatore(3, true)];
    await expect(salvaRosaGara(supabase, { ...base, lato: "casa", giocatori })).rejects.toBeInstanceOf(
      RosaValidationError
    );
  });

  it("troppi atleti (liberi compresi)", async () => {
    const giocatori = [giocatore(1, true)];
    for (let n = 2; n <= 15; n++) giocatori.push(giocatore(n));
    await expect(salvaRosaGara(supabase, { ...base, lato: "casa", giocatori })).rejects.toThrow(/14/);
    expect(salvaRosaMock).not.toHaveBeenCalled();
  });

  it("rispetta i parametri effettivi (rosaMax 14 al limite passa)", async () => {
    const giocatori = [giocatore(1, true)];
    for (let n = 2; n <= 14; n++) giocatori.push(giocatore(n));
    await expect(salvaRosaGara(supabase, { ...base, lato: "casa", giocatori })).resolves.toBeDefined();
  });
});

describe("salvaRosaSquadra (story 3.9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leggiParametriSquadraMock.mockResolvedValue(PARAMETRI);
    salvaRosaMock.mockResolvedValue({ esito: "ok", versione: 1 });
  });

  const base = { squadraId: "s-1", versioneBase: 0, idModifica: ID, tesserati: [{ ruolo: "A" as const, nome: "L" }] };

  it("rosa corretta: salva sulla squadra con i parametri della sua Categoria", async () => {
    const giocatori = [giocatore(1), giocatore(2, true)];
    await expect(salvaRosaSquadra(supabase, { ...base, giocatori })).resolves.toEqual({
      esito: "ok",
      versione: 1,
    });
    expect(leggiParametriSquadraMock).toHaveBeenCalledWith("s-1");
    expect(salvaRosaMock).toHaveBeenCalledWith(supabase, "s-1", 0, ID, giocatori, base.tesserati);
  });

  it("conflitto come valore", async () => {
    salvaRosaMock.mockResolvedValue({ esito: "conflitto", versione: 4 });
    await expect(
      salvaRosaSquadra(supabase, { ...base, giocatori: [giocatore(1, true)] })
    ).resolves.toEqual({ esito: "conflitto", versione: 4 });
  });

  it("senza libero con liberiMin 1: validazione, nulla salvato", async () => {
    await expect(salvaRosaSquadra(supabase, { ...base, giocatori: [giocatore(1)] })).rejects.toBeInstanceOf(
      RosaValidationError
    );
    expect(salvaRosaMock).not.toHaveBeenCalled();
  });

  it("troppi atleti secondo rosaMax della Categoria", async () => {
    const giocatori = [giocatore(1, true)];
    for (let n = 2; n <= 15; n++) giocatori.push(giocatore(n));
    await expect(salvaRosaSquadra(supabase, { ...base, giocatori })).rejects.toThrow(
      "al massimo 14 giocatori"
    );
  });

  it("numeri doppi e due capitani", async () => {
    await expect(
      salvaRosaSquadra(supabase, { ...base, giocatori: [giocatore(1, true), giocatore(1)] })
    ).rejects.toThrow(/stesso numero/);
    await expect(
      salvaRosaSquadra(supabase, {
        ...base,
        giocatori: [{ ...giocatore(1, true), capitano: true }, { ...giocatore(2), capitano: true }],
      })
    ).rejects.toThrow(/un solo capitano/);
  });

  it("squadra inesistente: errore", async () => {
    leggiParametriSquadraMock.mockResolvedValue(null);
    await expect(salvaRosaSquadra(supabase, { ...base, giocatori: [] })).rejects.toThrow();
  });
});

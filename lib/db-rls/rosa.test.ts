import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const rpcMock = vi.fn();
const maybeSingleMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
}));

const supabase = { from: fromMock, rpc: rpcMock } as never;

const { leggiRosa, salvaRosa, RosaForbiddenError, RosaValidationError } = await import("./rosa");

const ID = "11111111-1111-4111-8111-111111111111";

describe("leggiRosa", () => {
  beforeEach(() => maybeSingleMock.mockReset());

  it("restituisce null se la rosa non e' visibile", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await leggiRosa(supabase, "s1")).toBeNull();
  });

  it("compone versione e ordina giocatori per numero e tesserati per ruolo e nome", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        versione: 3,
        giocatori_rosa: [
          { id: "g2", numero: 9 },
          { id: "g1", numero: 5 },
        ],
        tesserati_rosa: [
          { id: "t3", ruolo: "D", nome: "A" },
          { id: "t2", ruolo: "A", nome: "B" },
          { id: "t1", ruolo: "A", nome: "A" },
        ],
      },
      error: null,
    });
    const rosa = await leggiRosa(supabase, "s1");
    expect(rosa?.versione).toBe(3);
    expect(rosa?.giocatori.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(rosa?.tesserati.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("propaga l'errore di lettura", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(leggiRosa(supabase, "s1")).rejects.toThrow("boom");
  });
});

describe("salvaRosa", () => {
  beforeEach(() => rpcMock.mockReset());

  it("chiama la funzione con i parametri e restituisce l'esito", async () => {
    rpcMock.mockResolvedValue({ data: { esito: "ok", versione: 1 }, error: null });
    const r = await salvaRosa(supabase, "s1", 0, ID, [], []);
    expect(r).toEqual({ esito: "ok", versione: 1 });
    expect(rpcMock).toHaveBeenCalledWith("salva_rosa_squadra", {
      squadra_id_param: "s1",
      versione_base: 0,
      id_modifica: ID,
      giocatori: [],
      tesserati: [],
    });
  });

  it("mappa il conflitto", async () => {
    rpcMock.mockResolvedValue({ data: { esito: "conflitto", versione: 4 }, error: null });
    expect(await salvaRosa(supabase, "s1", 0, ID, [], [])).toEqual({ esito: "conflitto", versione: 4 });
  });

  it("mappa FORBIDDEN", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "FORBIDDEN", code: "P0001" } });
    await expect(salvaRosa(supabase, "s1", 0, ID, [], [])).rejects.toBeInstanceOf(RosaForbiddenError);
  });

  it("mappa il permesso negato (42501) a FORBIDDEN", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "permission denied", code: "42501" } });
    await expect(salvaRosa(supabase, "s1", 0, ID, [], [])).rejects.toBeInstanceOf(RosaForbiddenError);
  });

  it("mappa VALIDATION", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "VALIDATION: numero di maglia doppio" } });
    await expect(salvaRosa(supabase, "s1", 0, ID, [], [])).rejects.toBeInstanceOf(RosaValidationError);
  });

  it("altri errori restano errori generici", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(salvaRosa(supabase, "s1", 0, ID, [], [])).rejects.toThrow("boom");
  });

  it("rifiuta una risposta inattesa", async () => {
    rpcMock.mockResolvedValue({ data: { esito: "boh" }, error: null });
    await expect(salvaRosa(supabase, "s1", 0, ID, [], [])).rejects.toThrow();
  });
});

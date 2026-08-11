import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const createClientMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

const { risolviRuoliPerAiutoContestuale } = await import("./risolvi-ruoli-pagina");

beforeEach(() => {
  getUserMock.mockReset();
  createClientMock.mockReset();
  createClientMock.mockResolvedValue({ auth: { getUser: getUserMock } });
});

describe("risolviRuoliPerAiutoContestuale", () => {
  it("restituisce i Ruoli dell'Utente autenticato", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ADMIN"] } } },
      error: null,
    });

    expect(await risolviRuoliPerAiutoContestuale()).toEqual(["ADMIN"]);
  });

  it("restituisce un elenco vuoto (fail-soft) se getUser() restituisce un errore", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error("sessione scaduta") });

    expect(await risolviRuoliPerAiutoContestuale()).toEqual([]);
  });

  it("restituisce un elenco vuoto (fail-soft) se getUser() lancia", async () => {
    getUserMock.mockRejectedValue(new Error("rete non disponibile"));

    expect(await risolviRuoliPerAiutoContestuale()).toEqual([]);
  });

  it("restituisce un elenco vuoto (fail-soft) se createClient() stesso lancia", async () => {
    createClientMock.mockRejectedValue(new Error("configurazione mancante"));

    expect(await risolviRuoliPerAiutoContestuale()).toEqual([]);
  });
});

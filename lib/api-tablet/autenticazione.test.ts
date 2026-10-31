import { describe, expect, it, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const createClientMock = vi.fn(() => ({ auth: { getUser: getUserMock } }));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

const { autenticaTablet, estraiBearer } = await import("./autenticazione");

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1LTEifQ.firma_valida-123";

function richiesta(authorization?: string) {
  return new Request("https://example.test/api/tablet/v1/gare", {
    headers: authorization ? { authorization } : undefined,
  });
}

async function attesoNonAutenticato(esito: Awaited<ReturnType<typeof autenticaTablet>>) {
  expect(esito.ok).toBe(false);
  if (esito.ok) return;
  expect(esito.risposta.status).toBe(401);
  expect(esito.risposta.headers.get("location")).toBeNull();
  expect(await esito.risposta.json()).toEqual({
    error: { code: "NON_AUTENTICATO", message: expect.any(String) },
  });
}

describe("estraiBearer", () => {
  it("estrae un JWT da un header Bearer", () => {
    expect(estraiBearer(`Bearer ${JWT}`)).toBe(JWT);
  });

  it.each([
    [null],
    [""],
    ["Bearer"],
    ["Bearer "],
    ["Bearer abc"],
    [`Basic ${JWT}`],
    [`bearer${JWT}`],
    [`Bearer ${JWT} altro`],
  ])("rifiuta %j", (header) => {
    expect(estraiBearer(header)).toBeNull();
  });
});

describe("autenticaTablet", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://prova.supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chiave-anon");
    getUserMock.mockReset();
    createClientMock.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("restituisce l'utente con un Bearer valido, usando un client anon senza sessione", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });

    const esito = await autenticaTablet(richiesta(`Bearer ${JWT}`));

    expect(esito).toEqual({ ok: true, utente: { id: "u-1" } });
    expect(createClientMock).toHaveBeenCalledWith(
      "https://prova.supabase.test",
      "chiave-anon",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    expect(getUserMock).toHaveBeenCalledWith(JWT);
  });

  it("401 NON_AUTENTICATO senza header, senza chiamare Supabase", async () => {
    await attesoNonAutenticato(await autenticaTablet(richiesta()));
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it.each([["Bearer abc"], [`Basic ${JWT}`]])(
    "401 NON_AUTENTICATO con header malformato %j, senza chiamare Supabase",
    async (header) => {
      await attesoNonAutenticato(await autenticaTablet(richiesta(header)));
      expect(getUserMock).not.toHaveBeenCalled();
    }
  );

  it("401 NON_AUTENTICATO quando getUser rifiuta il token (scaduto o non valido)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid JWT: token is expired" },
    });
    await attesoNonAutenticato(await autenticaTablet(richiesta(`Bearer ${JWT}`)));
  });

  it("401 NON_AUTENTICATO quando getUser lancia (fail-closed)", async () => {
    getUserMock.mockRejectedValue(new Error("rete"));
    await attesoNonAutenticato(await autenticaTablet(richiesta(`Bearer ${JWT}`)));
  });

  it("401 NON_AUTENTICATO quando la configurazione Supabase manca", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    await attesoNonAutenticato(await autenticaTablet(richiesta(`Bearer ${JWT}`)));
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("non scrive mai il JWT nei log", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "x" } });
    await autenticaTablet(richiesta(`Bearer ${JWT}`));
    const loggato = vi.mocked(console.warn).mock.calls.flat().join(" ");
    expect(loggato).not.toContain(JWT);
    expect(loggato).toContain("NON_AUTENTICATO");
  });
});

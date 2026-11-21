import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const { clientSupabaseTabletOErrore, rispostaJsonTablet, rispostaRoseNonConsentite } = await import(
  "./risposta-errore"
);

describe("helper delle rotte del tablet (epic 3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rispostaRoseNonConsentite: 403 FORBIDDEN no-store con log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = rispostaRoseNonConsentite();
    expect(r.status).toBe(403);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({
      error: { code: "FORBIDDEN", message: "Accesso alle rose non consentito." },
    });
    expect(warn).toHaveBeenCalledWith("api-tablet FORBIDDEN motivo=ROSE_RLS");
  });

  it("clientSupabaseTabletOErrore: senza configurazione 500 INTERNAL con log", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const errore = vi.spyOn(console, "error").mockImplementation(() => {});
    const esito = clientSupabaseTabletOErrore("jwt");
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.risposta.status).toBe(500);
    expect((await esito.risposta.json()).error.code).toBe("INTERNAL");
    expect(errore).toHaveBeenCalledWith("api-tablet INTERNAL motivo=CONFIGURAZIONE_MANCANTE");
  });

  it("clientSupabaseTabletOErrore: con configurazione restituisce il client", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const esito = clientSupabaseTabletOErrore("jwt");
    expect(esito.ok).toBe(true);
  });

  it("rispostaJsonTablet: 200 JSON no-store", async () => {
    const r = rispostaJsonTablet({ a: 1 });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ a: 1 });
  });
});

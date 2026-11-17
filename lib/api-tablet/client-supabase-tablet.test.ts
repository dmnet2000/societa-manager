import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
const createClientMock = vi.fn(() => ({ marker: "client" }));
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

const { creaClientSupabaseTablet } = await import("./client-supabase-tablet");

describe("creaClientSupabaseTablet", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    vi.unstubAllEnvs();
  });

  it("crea il client con il Bearer del tablet e senza sessione persistita", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://prova.supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chiave-anon");

    expect(creaClientSupabaseTablet("a.b.c")).toEqual({ marker: "client" });
    expect(createClientMock).toHaveBeenCalledWith("https://prova.supabase.test", "chiave-anon", {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: "Bearer a.b.c" } },
    });
  });

  it("null se manca la configurazione", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(creaClientSupabaseTablet("a.b.c")).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

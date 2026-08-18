import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const adminClientFinto = { admin: "client" };
const createAdminClientMock = vi.fn(() => adminClientFinto);
vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

const leggiNomeSettoreMock = vi.fn();
vi.mock("@/lib/configurazione-applicazione", () => ({
  leggiNomeSettore: leggiNomeSettoreMock,
  NOME_SETTORE_FALLBACK: "Settore Volley",
}));

const leggiInfoLogoMock = vi.fn();
const urlPubblicoLogoMock = vi.fn(
  () => "https://esempio.supabase.co/storage/v1/object/public/logo-applicazione/logo"
);
vi.mock("@/lib/storage/logo", () => ({
  leggiInfoLogo: leggiInfoLogoMock,
  urlPubblicoLogo: urlPubblicoLogoMock,
}));

// Story 18.21 (Review fix): generateMetadata era l'unica parte della storia
// senza alcun test - stesso principio di mock diretto dei moduli chiamati
// gia' in uso in lib/facebook-graph.test.ts (createAdminClient) e
// app/manifest.test.ts (equivalente per il manifest PWA).
const { generateMetadata } = await import("./layout");

describe("generateMetadata (Story 18.21)", () => {
  beforeEach(() => {
    createAdminClientMock.mockClear();
    leggiNomeSettoreMock.mockReset();
    leggiInfoLogoMock.mockReset();
    urlPubblicoLogoMock.mockClear();
    leggiNomeSettoreMock.mockResolvedValue("Volley Mogliano");
    leggiInfoLogoMock.mockResolvedValue({ esiste: false, aggiornatoIl: null });
  });

  it("uses the configured nomeSettore as the tab title (AC #2)", async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Volley Mogliano");
  });

  it("falls back to 'Settore Volley' when nomeSettore is not configured (AC #3)", async () => {
    leggiNomeSettoreMock.mockResolvedValue(null);

    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Settore Volley");
  });

  it("falls back to 'Settore Volley' when leggiNomeSettore rejects (fail-soft)", async () => {
    leggiNomeSettoreMock.mockRejectedValue(new Error("boom"));

    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Settore Volley");
  });

  it("uses the static placeholder icon when no logo has been uploaded (AC #1)", async () => {
    const metadata = await generateMetadata();

    expect(metadata.icons).toMatchObject({ icon: "/icons/icon-192.png" });
  });

  it("uses the real logo URL with a cache-buster when a logo has been uploaded (AC #1, #5)", async () => {
    leggiInfoLogoMock.mockResolvedValue({
      esiste: true,
      aggiornatoIl: "2026-08-18T10:00:00Z",
    });

    const metadata = await generateMetadata();

    expect(metadata.icons).toMatchObject({
      icon: `https://esempio.supabase.co/storage/v1/object/public/logo-applicazione/logo?v=${encodeURIComponent("2026-08-18T10:00:00Z")}`,
    });
  });

  it("falls back to the static placeholder icon when leggiInfoLogo rejects (fail-soft, AC #1)", async () => {
    leggiInfoLogoMock.mockRejectedValue(new Error("boom"));

    const metadata = await generateMetadata();

    expect(metadata.icons).toMatchObject({ icon: "/icons/icon-192.png" });
  });

  it("keeps the apple icon and appleWebApp metadata unchanged", async () => {
    const metadata = await generateMetadata();

    expect(metadata.icons).toMatchObject({ apple: "/icons/icon-192.png" });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      title: "Soc. Manager",
      statusBarStyle: "default",
    });
  });

  it("falls back to safe static metadata when createAdminClient() throws (Review fix)", async () => {
    createAdminClientMock.mockImplementationOnce(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante");
    });

    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Settore Volley");
    expect(metadata.icons).toMatchObject({ icon: "/icons/icon-192.png" });
    expect(leggiNomeSettoreMock).not.toHaveBeenCalled();
  });

  it("keeps the description unchanged", async () => {
    const metadata = await generateMetadata();

    expect(metadata.description).toBe(
      "Gestione settore volley — orari, presenze, certificati medici"
    );
  });
});

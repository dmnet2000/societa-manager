import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));

const supabase = { storage: { from: fromMock } } as never;

const { caricaImmagineSponsor, urlPubblicoImmagineSponsor } = await import(
  "./sponsor"
);

function fileFinto(tipo = "image/png") {
  return { name: "banner.png", type: tipo } as File;
}

describe("caricaImmagineSponsor", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path per-entita' (sponsorId) con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "sponsor-1" }, error: null });
    const file = fileFinto("image/png");

    await caricaImmagineSponsor(supabase, "sponsor-1", file);

    expect(fromMock).toHaveBeenCalledWith("sponsor-banner");
    expect(uploadMock).toHaveBeenCalledWith("sponsor-1", file, {
      upsert: true,
      contentType: "image/png",
    });
  });

  it("throws when the upload fails (incluso un rifiuto RLS)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      caricaImmagineSponsor(supabase, "sponsor-1", fileFinto())
    ).rejects.toThrow("row-level security");
  });
});

describe("urlPubblicoImmagineSponsor", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path per-entita' (sponsorId)", () => {
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://esempio.local/storage/v1/object/public/sponsor-banner/sponsor-1",
      },
    });

    const url = urlPubblicoImmagineSponsor(supabase, "sponsor-1");

    expect(fromMock).toHaveBeenCalledWith("sponsor-banner");
    expect(getPublicUrlMock).toHaveBeenCalledWith("sponsor-1");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/sponsor-banner/sponsor-1"
    );
  });
});

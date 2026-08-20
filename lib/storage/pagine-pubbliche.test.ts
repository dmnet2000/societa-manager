import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("node:crypto", () => ({
  randomUUID: () => "11111111-1111-1111-1111-111111111111",
}));

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
}));

const supabase = { storage: { from: fromMock } } as never;

const { caricaImmaginePaginaPubblica } = await import("./pagine-pubbliche");

function fileFinto(tipo = "image/png") {
  return { name: "immagine.png", type: tipo } as File;
}

describe("caricaImmaginePaginaPubblica", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
  });

  it("carica su un path per-file (nome casuale, non l'id di un'entita') con contentType esplicito", async () => {
    uploadMock.mockResolvedValue({
      data: { path: "11111111-1111-1111-1111-111111111111.png" },
      error: null,
    });
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://esempio.local/storage/v1/object/public/contenuti-pagine-pubbliche/11111111-1111-1111-1111-111111111111.png",
      },
    });
    const file = fileFinto("image/png");

    const url = await caricaImmaginePaginaPubblica(supabase, file);

    expect(fromMock).toHaveBeenCalledWith("contenuti-pagine-pubbliche");
    expect(uploadMock).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111.png",
      file,
      { contentType: "image/png" }
    );
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/contenuti-pagine-pubbliche/11111111-1111-1111-1111-111111111111.png"
    );
  });

  it("usa l'estensione .jpg per un'immagine image/jpeg", async () => {
    uploadMock.mockResolvedValue({ data: { path: "x.jpg" }, error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: "https://esempio.local/x.jpg" } });

    await caricaImmaginePaginaPubblica(supabase, fileFinto("image/jpeg"));

    expect(uploadMock).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111.jpg",
      expect.anything(),
      { contentType: "image/jpeg" }
    );
  });

  it("throws when the upload fails (incluso un rifiuto RLS)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      caricaImmaginePaginaPubblica(supabase, fileFinto())
    ).rejects.toThrow("row-level security");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const listMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
  list: listMock,
}));

const supabase = { storage: { from: fromMock } } as never;

const { caricaLogoPolisportiva, urlPubblicoLogoPolisportiva, leggiInfoLogoPolisportiva } =
  await import("./logo-polisportiva");

function fileFinto(tipo = "image/png") {
  return { name: "logo-polisportiva.png", type: tipo } as File;
}

describe("caricaLogoPolisportiva", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path fisso 'logo-polisportiva' con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "logo-polisportiva" }, error: null });
    const file = fileFinto("image/png");

    await caricaLogoPolisportiva(supabase, file);

    expect(fromMock).toHaveBeenCalledWith("logo-polisportiva");
    expect(uploadMock).toHaveBeenCalledWith("logo-polisportiva", file, {
      upsert: true,
      contentType: "image/png",
    });
  });

  it("throws when the upload fails (incluso un rifiuto RLS, AC #3)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(caricaLogoPolisportiva(supabase, fileFinto())).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("urlPubblicoLogoPolisportiva", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path fisso 'logo-polisportiva' (AC #4)", () => {
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://esempio.local/storage/v1/object/public/logo-polisportiva/logo-polisportiva",
      },
    });

    const url = urlPubblicoLogoPolisportiva(supabase);

    expect(fromMock).toHaveBeenCalledWith("logo-polisportiva");
    expect(getPublicUrlMock).toHaveBeenCalledWith("logo-polisportiva");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/logo-polisportiva/logo-polisportiva"
    );
  });
});

describe("leggiInfoLogoPolisportiva", () => {
  beforeEach(() => {
    fromMock.mockClear();
    listMock.mockReset();
  });

  it("restituisce esiste:true e la data di aggiornamento quando il logo esiste (AC #4)", async () => {
    listMock.mockResolvedValue({
      data: [{ name: "logo-polisportiva", updated_at: "2026-08-15T12:00:00.000Z" }],
      error: null,
    });

    const risultato = await leggiInfoLogoPolisportiva(supabase);

    expect(fromMock).toHaveBeenCalledWith("logo-polisportiva");
    expect(listMock).toHaveBeenCalledWith("", { search: "logo-polisportiva" });
    expect(risultato).toEqual({
      esiste: true,
      aggiornatoIl: "2026-08-15T12:00:00.000Z",
    });
  });

  it("restituisce esiste:false e aggiornatoIl:null quando nessun logo e' mai stato caricato (AC #4)", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await leggiInfoLogoPolisportiva(supabase);

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  it("throws when the listing fails", async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(leggiInfoLogoPolisportiva(supabase)).rejects.toThrow("not found");
  });
});

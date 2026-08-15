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

const { caricaFotoHero, urlPubblicoFotoHero, leggiInfoFotoHero } = await import(
  "./foto-hero"
);

function fileFinto(tipo = "image/png") {
  return { name: "foto-hero.png", type: tipo } as File;
}

describe("caricaFotoHero", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path fisso 'foto-hero' con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "foto-hero" }, error: null });
    const file = fileFinto("image/png");

    await caricaFotoHero(supabase, file);

    expect(fromMock).toHaveBeenCalledWith("foto-hero");
    expect(uploadMock).toHaveBeenCalledWith("foto-hero", file, {
      upsert: true,
      contentType: "image/png",
    });
  });

  it("throws when the upload fails (incluso un rifiuto RLS, AC #2)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(caricaFotoHero(supabase, fileFinto())).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("urlPubblicoFotoHero", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path fisso 'foto-hero' (AC #3)", () => {
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://esempio.local/storage/v1/object/public/foto-hero/foto-hero" },
    });

    const url = urlPubblicoFotoHero(supabase);

    expect(fromMock).toHaveBeenCalledWith("foto-hero");
    expect(getPublicUrlMock).toHaveBeenCalledWith("foto-hero");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/foto-hero/foto-hero"
    );
  });
});

describe("leggiInfoFotoHero", () => {
  beforeEach(() => {
    fromMock.mockClear();
    listMock.mockReset();
  });

  it("restituisce esiste:true e la data di aggiornamento quando la foto esiste (AC #3)", async () => {
    listMock.mockResolvedValue({
      data: [{ name: "foto-hero", updated_at: "2026-08-15T12:00:00.000Z" }],
      error: null,
    });

    const risultato = await leggiInfoFotoHero(supabase);

    expect(fromMock).toHaveBeenCalledWith("foto-hero");
    expect(listMock).toHaveBeenCalledWith("", { search: "foto-hero" });
    expect(risultato).toEqual({
      esiste: true,
      aggiornatoIl: "2026-08-15T12:00:00.000Z",
    });
  });

  it("restituisce esiste:false e aggiornatoIl:null quando nessuna foto e' mai stata caricata (AC #3)", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await leggiInfoFotoHero(supabase);

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  it("throws when the listing fails", async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(leggiInfoFotoHero(supabase)).rejects.toThrow("not found");
  });
});

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

const { caricaFotoSquadra, urlPubblicoFotoSquadra, elencaGruppiConFoto } =
  await import("./foto-squadra");

function fileFinto(tipo = "image/png") {
  return { name: "squadra.png", type: tipo } as File;
}

describe("caricaFotoSquadra", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path per-entita' (gruppoId) con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "gruppo-1" }, error: null });
    const file = fileFinto("image/png");

    await caricaFotoSquadra(supabase, "gruppo-1", file);

    expect(fromMock).toHaveBeenCalledWith("foto-squadra-gruppo");
    expect(uploadMock).toHaveBeenCalledWith("gruppo-1", file, {
      upsert: true,
      contentType: "image/png",
    });
  });

  it("throws when the upload fails (incluso un rifiuto RLS, AC #2)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      caricaFotoSquadra(supabase, "gruppo-1", fileFinto())
    ).rejects.toThrow("row-level security");
  });
});

describe("urlPubblicoFotoSquadra", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path per-entita' (gruppoId)", () => {
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://esempio.local/storage/v1/object/public/foto-squadra-gruppo/gruppo-1",
      },
    });

    const url = urlPubblicoFotoSquadra(supabase, "gruppo-1");

    expect(fromMock).toHaveBeenCalledWith("foto-squadra-gruppo");
    expect(getPublicUrlMock).toHaveBeenCalledWith("gruppo-1");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/foto-squadra-gruppo/gruppo-1"
    );
  });
});

describe("elencaGruppiConFoto", () => {
  beforeEach(() => {
    fromMock.mockClear();
    listMock.mockReset();
  });

  it("restituisce una Map gruppoId -> aggiornatoIl con una sola chiamata list() sull'intero bucket (AC #3)", async () => {
    listMock.mockResolvedValue({
      data: [
        { name: "gruppo-1", updated_at: "2026-08-13T12:00:00.000Z" },
        { name: "gruppo-2", updated_at: "2026-08-10T08:30:00.000Z" },
      ],
      error: null,
    });

    const risultato = await elencaGruppiConFoto(supabase);

    expect(fromMock).toHaveBeenCalledWith("foto-squadra-gruppo");
    expect(listMock).toHaveBeenCalledWith("");
    expect(risultato).toEqual(
      new Map([
        ["gruppo-1", "2026-08-13T12:00:00.000Z"],
        ["gruppo-2", "2026-08-10T08:30:00.000Z"],
      ])
    );
  });

  it("restituisce una Map vuota quando nessun Gruppo ha una foto (nessun placeholder, AC #3)", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await elencaGruppiConFoto(supabase);

    expect(risultato).toEqual(new Map());
  });

  it("throws when the listing fails", async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(elencaGruppiConFoto(supabase)).rejects.toThrow("not found");
  });
});

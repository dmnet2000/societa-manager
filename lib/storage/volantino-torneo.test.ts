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

const { caricaVolantinoTorneo, urlPubblicoVolantinoTorneo, leggiInfoVolantinoTorneo } =
  await import("./volantino-torneo");

function fileFinto(tipo = "image/png") {
  return { name: "volantino.png", type: tipo } as File;
}

describe("caricaVolantinoTorneo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path per-entita' (edizioneTorneoId) con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "edizione-1" }, error: null });
    const file = fileFinto("image/png");

    await caricaVolantinoTorneo(supabase, "edizione-1", file);

    expect(fromMock).toHaveBeenCalledWith("volantino-torneo");
    expect(uploadMock).toHaveBeenCalledWith("edizione-1", file, {
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
      caricaVolantinoTorneo(supabase, "edizione-1", fileFinto())
    ).rejects.toThrow("row-level security");
  });
});

describe("urlPubblicoVolantinoTorneo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path per-entita' (edizioneTorneoId)", () => {
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          "https://esempio.local/storage/v1/object/public/volantino-torneo/edizione-1",
      },
    });

    const url = urlPubblicoVolantinoTorneo(supabase, "edizione-1");

    expect(fromMock).toHaveBeenCalledWith("volantino-torneo");
    expect(getPublicUrlMock).toHaveBeenCalledWith("edizione-1");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/volantino-torneo/edizione-1"
    );
  });
});

describe("leggiInfoVolantinoTorneo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    listMock.mockReset();
  });

  it("restituisce esiste:true e la data di aggiornamento quando il volantino esiste (AC #3)", async () => {
    listMock.mockResolvedValue({
      data: [{ name: "edizione-1", updated_at: "2026-08-24T12:00:00.000Z" }],
      error: null,
    });

    const risultato = await leggiInfoVolantinoTorneo(supabase, "edizione-1");

    expect(fromMock).toHaveBeenCalledWith("volantino-torneo");
    expect(listMock).toHaveBeenCalledWith("", { search: "edizione-1" });
    expect(risultato).toEqual({
      esiste: true,
      aggiornatoIl: "2026-08-24T12:00:00.000Z",
    });
  });

  it("restituisce esiste:false e aggiornatoIl:null quando nessun volantino e' mai stato caricato (AC #3)", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await leggiInfoVolantinoTorneo(supabase, "edizione-1");

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  // search e' un filtro di prefisso, non un match esatto - un'altra Edizione
  // il cui id inizia con lo stesso prefisso non deve risultare come "esiste".
  it("ignora un oggetto il cui nome non corrisponde esattamente (search e' un prefisso, non un match esatto)", async () => {
    listMock.mockResolvedValue({
      data: [{ name: "edizione-10", updated_at: "2026-08-24T12:00:00.000Z" }],
      error: null,
    });

    const risultato = await leggiInfoVolantinoTorneo(supabase, "edizione-1");

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  it("throws when the listing fails", async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(leggiInfoVolantinoTorneo(supabase, "edizione-1")).rejects.toThrow(
      "not found"
    );
  });
});

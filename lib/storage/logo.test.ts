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

const { caricaLogo, urlPubblicoLogo, leggiInfoLogo } = await import("./logo");

function fileFinto(tipo = "image/png") {
  return { name: "logo.png", type: tipo } as File;
}

describe("caricaLogo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    uploadMock.mockReset();
  });

  it("carica sul path fisso 'logo' con upsert e contentType espliciti (AC #1)", async () => {
    uploadMock.mockResolvedValue({ data: { path: "logo" }, error: null });
    const file = fileFinto("image/png");

    await caricaLogo(supabase, file);

    expect(fromMock).toHaveBeenCalledWith("logo-applicazione");
    expect(uploadMock).toHaveBeenCalledWith("logo", file, {
      upsert: true,
      contentType: "image/png",
    });
  });

  it("throws when the upload fails (incluso un rifiuto RLS, AC #3)", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(caricaLogo(supabase, fileFinto())).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("urlPubblicoLogo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    getPublicUrlMock.mockReset();
  });

  it("restituisce l'URL pubblico deterministico del path fisso 'logo' (AC #2)", () => {
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://esempio.local/storage/v1/object/public/logo-applicazione/logo" },
    });

    const url = urlPubblicoLogo(supabase);

    expect(fromMock).toHaveBeenCalledWith("logo-applicazione");
    expect(getPublicUrlMock).toHaveBeenCalledWith("logo");
    expect(url).toBe(
      "https://esempio.local/storage/v1/object/public/logo-applicazione/logo"
    );
  });
});

// Review fix: sostituisce la precedente esisteLogo() (solo booleano) - serve
// anche aggiornatoIl per il cache-busting dell'URL pubblico (Blind
// Hunter/Edge Case Hunter: un URL deterministico e sempre identico rischia
// di restare in cache del browser dopo una sostituzione, nonostante
// revalidatePath, che invalida solo la cache RSC di Next.js, non le
// richieste dirette del browser verso l'endpoint pubblico di Supabase).
describe("leggiInfoLogo", () => {
  beforeEach(() => {
    fromMock.mockClear();
    listMock.mockReset();
  });

  it("restituisce esiste:true e la data di aggiornamento quando il file 'logo' esiste (AC #5)", async () => {
    listMock.mockResolvedValue({
      data: [{ name: "logo", updated_at: "2026-07-18T12:00:00.000Z" }],
      error: null,
    });

    const risultato = await leggiInfoLogo(supabase);

    expect(fromMock).toHaveBeenCalledWith("logo-applicazione");
    expect(listMock).toHaveBeenCalledWith("", { search: "logo" });
    expect(risultato).toEqual({
      esiste: true,
      aggiornatoIl: "2026-07-18T12:00:00.000Z",
    });
  });

  it("restituisce esiste:false e aggiornatoIl:null quando nessun logo e' mai stato caricato (AC #5)", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    const risultato = await leggiInfoLogo(supabase);

    expect(risultato).toEqual({ esiste: false, aggiornatoIl: null });
  });

  it("throws when the listing fails", async () => {
    listMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(leggiInfoLogo(supabase)).rejects.toThrow("not found");
  });
});

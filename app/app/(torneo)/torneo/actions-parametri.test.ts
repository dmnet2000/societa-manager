import { describe, expect, it, vi, beforeEach } from "vitest";

// Referto elettronico, story 3.8: azioni dei parametri del formato.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const trovaEdizioneMock = vi.fn();
const trovaCategoriaMock = vi.fn();
const elencaCategorieMock = vi.fn();
const salvaEdizioneMock = vi.fn();
const salvaCategoriaMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/storage/volantino-torneo", () => ({ caricaVolantinoTorneo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/torneo", () => ({
  trovaEdizioneTorneoPerId: trovaEdizioneMock,
  trovaCategoriaTorneoPerId: trovaCategoriaMock,
  elencaCategorieTorneo: elencaCategorieMock,
}));
vi.mock("@/lib/assegnazioni-tablet", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/parametri-formato", async (orig) => ({
  ...(await orig<typeof import("@/lib/parametri-formato")>()),
  salvaParametriEdizione: salvaEdizioneMock,
  salvaParametriCategoria: salvaCategoriaMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { salvaParametriEdizioneAction, salvaParametriCategoriaAction } = await import("./actions");

function form(campi: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campi)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireRuoloMock.mockResolvedValue(null);
  trovaEdizioneMock.mockResolvedValue({ id: "ed1", parametriFormato: null });
  trovaCategoriaMock.mockResolvedValue({ id: "c1", edizioneTorneoId: "ed1", parametriFormato: null });
  elencaCategorieMock.mockResolvedValue([]);
  salvaEdizioneMock.mockResolvedValue({ count: 1 });
  salvaCategoriaMock.mockResolvedValue({ count: 1 });
});

describe("salvaParametriEdizioneAction", () => {
  it("ruolo: ADMIN e DIRIGENTE, altrimenti nessuna scrittura", async () => {
    const forbidden = { error: { code: "FORBIDDEN", message: "Non autorizzato." } };
    requireRuoloMock.mockResolvedValue(forbidden);
    const res = await salvaParametriEdizioneAction(undefined, form({ edizioneTorneoId: "ed1" }));
    expect(res).toBe(forbidden);
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaEdizioneMock).not.toHaveBeenCalled();
  });

  it("salva solo le chiavi impostate", async () => {
    const res = await salvaParametriEdizioneAction(
      undefined,
      form({ edizioneTorneoId: "ed1", rosaMax: "12", cambiPerSet: "" })
    );
    expect(res).toEqual({ success: true });
    expect(salvaEdizioneMock).toHaveBeenCalledWith("ed1", { rosaMax: 12 });
  });

  it("tutto vuoto: oggetto vuoto (diventa null)", async () => {
    await salvaParametriEdizioneAction(undefined, form({ edizioneTorneoId: "ed1" }));
    expect(salvaEdizioneMock).toHaveBeenCalledWith("ed1", {});
  });

  it("valore non valido: errore per campo, nessun salvataggio", async () => {
    const res = await salvaParametriEdizioneAction(
      undefined,
      form({ edizioneTorneoId: "ed1", setPerVincere: "3", rosaMax: "30" })
    );
    expect(res).toMatchObject({
      error: { code: "VALIDATION" },
      errori: { setPerVincere: "Set per vincere: per ora solo 2" },
      inseriti: { setPerVincere: "3", rosaMax: "30" },
    });
    expect(salvaEdizioneMock).not.toHaveBeenCalled();
  });

  it("liberiMax 1 incoerente con un'eccezione di Categoria: rifiutato", async () => {
    elencaCategorieMock.mockResolvedValue([{ nome: "Under 14", parametriFormato: { liberiMin: 2 } }]);
    const res = await salvaParametriEdizioneAction(
      undefined,
      form({ edizioneTorneoId: "ed1", liberiMax: "1" })
    );
    const msg = "Liberi: con questo valore la categoria Under 14 avrebbe minimo 2 e massimo 1.";
    expect(res).toMatchObject({
      error: { code: "VALIDATION", message: msg },
      errori: { liberiMax: msg },
      inseriti: { liberiMax: "1" },
    });
    expect(res && "errori" in res && res.errori).not.toHaveProperty("liberiMin");
    expect(salvaEdizioneMock).not.toHaveBeenCalled();
  });

  it("Edizione inesistente: rifiutato", async () => {
    trovaEdizioneMock.mockResolvedValue(null);
    const res = await salvaParametriEdizioneAction(undefined, form({ edizioneTorneoId: "x" }));
    expect(res).toMatchObject({ error: { code: "VALIDATION" } });
    expect(salvaEdizioneMock).not.toHaveBeenCalled();
  });
});

describe("salvaParametriCategoriaAction", () => {
  it("ruolo non ammesso: nessuna scrittura", async () => {
    requireRuoloMock.mockResolvedValue({ error: { code: "FORBIDDEN", message: "x" } });
    await salvaParametriCategoriaAction(undefined, form({ edizioneTorneoId: "ed1", categoriaTorneoId: "c1" }));
    expect(salvaCategoriaMock).not.toHaveBeenCalled();
  });

  it("eccezione cambiPerSet 6", async () => {
    const res = await salvaParametriCategoriaAction(
      undefined,
      form({ edizioneTorneoId: "ed1", categoriaTorneoId: "c1", cambiPerSet: "6" })
    );
    expect(res).toEqual({ success: true });
    expect(salvaCategoriaMock).toHaveBeenCalledWith("c1", "ed1", { cambiPerSet: 6 });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/ed1/parametri");
  });

  it("Categoria di un'altra Edizione: rifiutato", async () => {
    trovaCategoriaMock.mockResolvedValue({ id: "c1", edizioneTorneoId: "altra", parametriFormato: null });
    const res = await salvaParametriCategoriaAction(
      undefined,
      form({ edizioneTorneoId: "ed1", categoriaTorneoId: "c1", cambiPerSet: "6" })
    );
    expect(res).toMatchObject({ error: { code: "VALIDATION" } });
    expect(salvaCategoriaMock).not.toHaveBeenCalled();
  });

  it("liberi: Edizione liberiMax 1, Categoria liberiMin 2 rifiutato", async () => {
    trovaEdizioneMock.mockResolvedValue({ id: "ed1", parametriFormato: { liberiMax: 1 } });
    const res = await salvaParametriCategoriaAction(
      undefined,
      form({ edizioneTorneoId: "ed1", categoriaTorneoId: "c1", liberiMin: "2" })
    );
    expect(res).toMatchObject({ error: { code: "VALIDATION" }, errori: { liberiMin: expect.any(String) } });
    expect(salvaCategoriaMock).not.toHaveBeenCalled();
  });

  it("fuori range: nessun salvataggio", async () => {
    const res = await salvaParametriCategoriaAction(
      undefined,
      form({ edizioneTorneoId: "ed1", categoriaTorneoId: "c1", rosaMax: "abc" })
    );
    expect(res).toMatchObject({ errori: { rosaMax: expect.any(String) } });
    expect(salvaCategoriaMock).not.toHaveBeenCalled();
  });
});

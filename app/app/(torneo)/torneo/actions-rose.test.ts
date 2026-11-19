import { describe, expect, it, vi, beforeEach } from "vitest";

// Referto elettronico, story 3.9: azione della rosa dal sito.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const trovaSquadraMock = vi.fn();
const trovaCategoriaMock = vi.fn();
const salvaRosaSquadraMock = vi.fn();
const revalidatePathMock = vi.fn();
const supabaseFinto = { marker: "sessione" };

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/storage/volantino-torneo", () => ({ caricaVolantinoTorneo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabaseFinto }));
vi.mock("@/lib/torneo", () => ({
  trovaSquadraTorneoPerId: trovaSquadraMock,
  trovaCategoriaTorneoPerId: trovaCategoriaMock,
}));
vi.mock("@/lib/assegnazioni-tablet", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/rose-gara", () => ({ salvaRosaSquadra: salvaRosaSquadraMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { salvaRosaSquadraAction } = await import("./actions");
const { RosaForbiddenError, RosaValidationError } = await import("@/lib/db-rls/rosa");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function form(extra: Record<string, string> = {}) {
  const fd = new FormData();
  const campi: Record<string, string> = {
    edizioneTorneoId: "ed1",
    categoriaTorneoId: "c1",
    squadraTorneoId: "s1",
    versioneBase: "0",
    g0_numero: "7",
    g0_nome: "Anna",
    g0_cognome: "Rossi",
    g0_libero: "on",
    t0_ruolo: "A",
    t0_nome: "Luca",
    ...extra,
  };
  for (const [k, v] of Object.entries(campi)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireRuoloMock.mockResolvedValue(null);
  trovaSquadraMock.mockResolvedValue({ id: "s1", categoriaTorneoId: "c1" });
  trovaCategoriaMock.mockResolvedValue({ id: "c1", edizioneTorneoId: "ed1" });
  salvaRosaSquadraMock.mockResolvedValue({ esito: "ok", versione: 1 });
});

describe("salvaRosaSquadraAction", () => {
  it("ruolo: ADMIN e DIRIGENTE, altrimenti nessuna scrittura", async () => {
    const forbidden = { error: { code: "FORBIDDEN", message: "Non autorizzato." } };
    requireRuoloMock.mockResolvedValue(forbidden);
    expect(await salvaRosaSquadraAction(undefined, form())).toBe(forbidden);
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(salvaRosaSquadraMock).not.toHaveBeenCalled();
  });

  it("inserimento in anticipo: salva con sessione, versioneBase e UUID nuovo", async () => {
    const res = await salvaRosaSquadraAction(undefined, form());
    expect(res).toEqual({ success: true, versione: 1 });
    const args = salvaRosaSquadraMock.mock.calls[0];
    expect(args[0]).toBe(supabaseFinto);
    expect(args[1]).toMatchObject({
      squadraId: "s1",
      versioneBase: 0,
      giocatori: [{ numero: 7, nome: "Anna", cognome: "Rossi", capitano: false, libero: true }],
      tesserati: [{ ruolo: "A", nome: "Luca" }],
    });
    expect(args[1].idModifica).toMatch(UUID);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/ed1/c1/s1/rosa");
  });

  it("idModifica nuovo a ogni salvataggio", async () => {
    await salvaRosaSquadraAction(undefined, form());
    await salvaRosaSquadraAction(undefined, form());
    expect(salvaRosaSquadraMock.mock.calls[0][1].idModifica).not.toBe(
      salvaRosaSquadraMock.mock.calls[1][1].idModifica
    );
  });

  it("conflitto: messaggio e valori restano, nessun revalidate", async () => {
    salvaRosaSquadraMock.mockResolvedValue({ esito: "conflitto", versione: 3 });
    const res = await salvaRosaSquadraAction(undefined, form({ versioneBase: "2" }));
    expect(res).toMatchObject({
      error: {
        code: "CONFLITTO",
        message: expect.stringContaining("ricaricala per vedere la versione attuale"),
      },
      inseriti: { giocatori: [{ nome: "Anna" }] },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("validazione del servizio (senza libero): messaggio, valori restano", async () => {
    salvaRosaSquadraMock.mockRejectedValue(new RosaValidationError("La rosa deve avere un libero."));
    const res = await salvaRosaSquadraAction(undefined, form());
    expect(res).toMatchObject({
      error: { code: "VALIDATION", message: "La rosa deve avere un libero." },
      inseriti: { giocatori: [{ nome: "Anna" }] },
    });
  });

  it("RLS nega: FORBIDDEN", async () => {
    salvaRosaSquadraMock.mockRejectedValue(new RosaForbiddenError());
    const res = await salvaRosaSquadraAction(undefined, form());
    expect(res).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("campo non valido: errori per riga, nessun salvataggio", async () => {
    const res = await salvaRosaSquadraAction(undefined, form({ g0_numero: "0", t0_ruolo: "X" }));
    expect(res).toMatchObject({ error: { code: "VALIDATION", message: "Correggi le righe indicate." } });
    expect(res && "errori" in res && res.errori).toEqual(
      expect.arrayContaining(["Giocatore 1: il numero di maglia deve essere da 1 a 99.", "Tesserato 1: il ruolo non è valido."])
    );
    expect(salvaRosaSquadraMock).not.toHaveBeenCalled();
  });

  it("id manomessi: squadra di un'altra Categoria o Categoria di un'altra Edizione", async () => {
    trovaSquadraMock.mockResolvedValue({ id: "s1", categoriaTorneoId: "altra" });
    expect(await salvaRosaSquadraAction(undefined, form())).toMatchObject({ error: { code: "VALIDATION" } });
    trovaSquadraMock.mockResolvedValue({ id: "s1", categoriaTorneoId: "c1" });
    trovaCategoriaMock.mockResolvedValue({ id: "c1", edizioneTorneoId: "altra" });
    expect(await salvaRosaSquadraAction(undefined, form())).toMatchObject({ error: { code: "VALIDATION" } });
    trovaSquadraMock.mockResolvedValue(null);
    expect(await salvaRosaSquadraAction(undefined, form())).toMatchObject({ error: { code: "VALIDATION" } });
    expect(salvaRosaSquadraMock).not.toHaveBeenCalled();
  });

  it("versioneBase non numerica: rifiutata", async () => {
    const res = await salvaRosaSquadraAction(undefined, form({ versioneBase: "x" }));
    expect(res).toMatchObject({ error: { code: "VALIDATION" } });
    expect(salvaRosaSquadraMock).not.toHaveBeenCalled();
  });

  it("errore inatteso: INTERNAL, log senza nomi", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    salvaRosaSquadraMock.mockRejectedValue(new Error("db Anna Rossi"));
    const res = await salvaRosaSquadraAction(undefined, form());
    expect(res).toMatchObject({ error: { code: "INTERNAL" } });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("Anna");
    spy.mockRestore();
  });
});

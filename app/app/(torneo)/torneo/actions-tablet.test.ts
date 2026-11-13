import { describe, expect, it, vi, beforeEach } from "vitest";

// Referto elettronico, story 2.5: assegnaTabletPartitaTorneoAction, in un
// file a parte per non appesantire actions.test.ts. Le altre dipendenze di
// actions.ts non servono a questa Server Action: i mock restano minimi.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const trovaPartitaTorneoPerIdMock = vi.fn();
const assegnaTabletPartitaMock = vi.fn();
const trovaUtenteConRuoliPerIdMock = vi.fn();
const trovaTabletAssegnatoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/storage/volantino-torneo", () => ({ caricaVolantinoTorneo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/torneo", () => ({ trovaPartitaTorneoPerId: trovaPartitaTorneoPerIdMock }));
vi.mock("@/lib/assegnazioni-tablet", () => ({
  assegnaTabletPartita: assegnaTabletPartitaMock,
  trovaUtenteConRuoliPerId: trovaUtenteConRuoliPerIdMock,
  trovaTabletAssegnato: trovaTabletAssegnatoMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { assegnaTabletPartitaTorneoAction } = await import("./actions");

function form(campi: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campi)) fd.set(k, v);
  return fd;
}

const PARTITA = { id: "p1", edizioneTorneoId: "ed1" };
const TABLET_ATTIVO = { id: "u1", attivo: true, ruoli: [{ ruolo: "TABLET" }] };

describe("assegnaTabletPartitaTorneoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRuoloMock.mockResolvedValue(null);
    trovaPartitaTorneoPerIdMock.mockResolvedValue(PARTITA);
    trovaUtenteConRuoliPerIdMock.mockResolvedValue(TABLET_ATTIVO);
    assegnaTabletPartitaMock.mockResolvedValue("creata");
  });

  it("ammette ADMIN e DIRIGENTE", async () => {
    await assegnaTabletPartitaTorneoAction(undefined, form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" }));
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
  });

  it("ruolo non ammesso: FORBIDDEN e nessuna scrittura", async () => {
    const forbidden = { error: { code: "FORBIDDEN", message: "Non autorizzato." } };
    requireRuoloMock.mockResolvedValue(forbidden);

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toBe(forbidden);
    expect(assegnaTabletPartitaMock).not.toHaveBeenCalled();
  });

  it("assegna la gara al tablet attivo e rivalida la pagina", async () => {
    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toEqual({ success: true });
    expect(assegnaTabletPartitaMock).toHaveBeenCalledWith("p1", "u1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/torneo/ed1/tablet");
  });

  it("utenteId vuoto = nessun tablet: nessun controllo sul tablet, scrittura con null", async () => {
    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "" })
    );

    expect(res).toEqual({ success: true });
    expect(trovaUtenteConRuoliPerIdMock).not.toHaveBeenCalled();
    expect(assegnaTabletPartitaMock).toHaveBeenCalledWith("p1", null);
  });

  it.each([
    ["inesistente", null],
    ["senza ruolo TABLET", { id: "u1", attivo: true, ruoli: [{ ruolo: "ADMIN" }] }],
  ])("tablet %s: VALIDATION e nessuna scrittura", async (_nome, utente) => {
    trovaUtenteConRuoliPerIdMock.mockResolvedValue(utente);

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toEqual({ error: { code: "VALIDATION", message: "Tablet non trovato." } });
    expect(assegnaTabletPartitaMock).not.toHaveBeenCalled();
  });

  it("tablet disattivato gia' su questa gara, salvato senza cambiarlo: nessun errore", async () => {
    trovaUtenteConRuoliPerIdMock.mockResolvedValue({ ...TABLET_ATTIVO, attivo: false });
    trovaTabletAssegnatoMock.mockResolvedValue("u1");
    assegnaTabletPartitaMock.mockResolvedValue("invariata");

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toEqual({ success: true });
  });

  it("tablet disattivato: VALIDATION e nessuna scrittura", async () => {
    trovaUtenteConRuoliPerIdMock.mockResolvedValue({ ...TABLET_ATTIVO, attivo: false });
    trovaTabletAssegnatoMock.mockResolvedValue("altro");

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toMatchObject({ error: { code: "VALIDATION" } });
    expect(assegnaTabletPartitaMock).not.toHaveBeenCalled();
  });

  it.each([
    ["inesistente", null],
    ["di un'altra Edizione", { id: "p1", edizioneTorneoId: "altra" }],
  ])("gara %s: VALIDATION e nessuna scrittura", async (_nome, partita) => {
    trovaPartitaTorneoPerIdMock.mockResolvedValue(partita);

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toEqual({
      error: { code: "VALIDATION", message: "Incontro non trovato in questa Edizione." },
    });
    expect(assegnaTabletPartitaMock).not.toHaveBeenCalled();
  });

  it("id o Edizione mancanti: VALIDATION senza leggere il database", async () => {
    const res = await assegnaTabletPartitaTorneoAction(undefined, form({ utenteId: "u1" }));

    expect(res).toMatchObject({ error: { code: "VALIDATION" } });
    expect(trovaPartitaTorneoPerIdMock).not.toHaveBeenCalled();
  });

  it("errore del database: INTERNAL", async () => {
    assegnaTabletPartitaMock.mockRejectedValue(new Error("db giu'"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await assegnaTabletPartitaTorneoAction(
      undefined,
      form({ id: "p1", edizioneTorneoId: "ed1", utenteId: "u1" })
    );

    expect(res).toEqual({
      error: { code: "INTERNAL", message: "Impossibile assegnare il tablet. Riprova." },
    });
  });
});

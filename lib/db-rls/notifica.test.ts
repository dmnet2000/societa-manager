import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const limitMock = vi.fn();
const orderMock = vi.fn(() => ({ limit: limitMock }));
const selectQueryMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({
  insert: insertMock,
  select: selectQueryMock,
}));

const supabase = { from: fromMock } as never;

const { creaNotifica, elencaNotifiche } = await import("./notifica");

describe("creaNotifica", () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
  });

  it("inserisce una notifica per l'Atleta con un id generato esplicitamente (AC #1)", async () => {
    insertMock.mockResolvedValue({ error: null });

    await creaNotifica(supabase, "atleta-1");

    expect(fromMock).toHaveBeenCalledWith("notifiche");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.atletaId).toBe("atleta-1");
    expect(typeof payload.id).toBe("string");
    expect(payload.id.length).toBeGreaterThan(0);
    // createdAt ha DEFAULT CURRENT_TIMESTAMP a livello Postgres - non deve
    // essere nel payload (unico caso in questo schema con un default
    // DB-side per una colonna diversa da un id).
    expect(payload).not.toHaveProperty("createdAt");
  });

  it("throws when the insert fails (incluso un rifiuto RLS, AC #2/#3)", async () => {
    insertMock.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(creaNotifica(supabase, "atleta-1")).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("elencaNotifiche", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectQueryMock.mockClear();
    orderMock.mockClear();
    limitMock.mockReset();
  });

  it("elenca le notifiche ordinate per data decrescente, colonne esplicite, limitate (AC #1, #5, review fix)", async () => {
    const righe = [
      { id: "n2", atletaId: "atleta-2", createdAt: "2026-07-18T10:00:00.000Z" },
      { id: "n1", atletaId: "atleta-1", createdAt: "2026-07-17T10:00:00.000Z" },
    ];
    limitMock.mockResolvedValue({ data: righe, error: null });

    const risultato = await elencaNotifiche(supabase);

    expect(fromMock).toHaveBeenCalledWith("notifiche");
    // review fix: colonne esplicite (mai select("*") - stesso principio di
    // ogni altra funzione di lettura in lib/db-rls/, es. elencaAtlete), cosi'
    // un futuro campo aggiunto alla tabella non viene esposto al client senza
    // una decisione consapevole in code review.
    expect(selectQueryMock).toHaveBeenCalledWith("id, atletaId, createdAt");
    expect(orderMock).toHaveBeenCalledWith("createdAt", { ascending: false });
    // review fix: limite alla lista - la tabella cresce senza limite (nessuna
    // deduplicazione/stato "letta", scelta deliberata di questa storia), un
    // tetto ragionevole evita che la pagina rallenti indefinitamente.
    expect(limitMock).toHaveBeenCalledWith(50);
    expect(risultato).toEqual(righe);
  });

  it("restituisce un array vuoto quando non ci sono notifiche visibili (RLS-scoped, AC #2)", async () => {
    limitMock.mockResolvedValue({ data: null, error: null });

    const risultato = await elencaNotifiche(supabase);

    expect(risultato).toEqual([]);
  });

  it("throws when the query fails", async () => {
    limitMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(elencaNotifiche(supabase)).rejects.toThrow("not found");
  });
});

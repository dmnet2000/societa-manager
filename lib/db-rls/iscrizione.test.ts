import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const eqAttivaMock = vi.fn();
const eqAnnoMock = vi.fn(() => ({ eq: eqAttivaMock }));
const selectMock = vi.fn(() => ({ eq: eqAnnoMock }));

// Catena chainable per update().eq()...eq().select() - supporta sia
// disattivaIscrizione (un solo .eq()) sia la riattivazione dentro
// inserisciIscrizione (tre .eq() concatenati), Story 1.8 review fix.
const updateSelectMock = vi.fn();
const updateEqMock = vi.fn(() => updateChain);
const updateChain = { eq: updateEqMock, select: updateSelectMock };
const updateMock = vi.fn<
  (payload: Record<string, unknown>) => typeof updateChain
>(() => updateChain);

const fromMock = vi.fn(() => ({
  insert: insertMock,
  select: selectMock,
  update: updateMock,
}));

const supabase = { from: fromMock } as never;

const { elencaIscrizioniPerAnno, inserisciIscrizione, disattivaIscrizione } =
  await import("./iscrizione");

describe("elencaIscrizioniPerAnno", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqAnnoMock.mockClear();
    eqAttivaMock.mockReset();
  });

  it("returns the id/atletaId of the Iscrizioni already iscritte (attive) for the given anno (Story 1.8: filtra attiva=true, id serve per l'esclusione)", async () => {
    eqAttivaMock.mockResolvedValue({
      data: [
        { id: "isc-1", atletaId: "a1" },
        { id: "isc-2", atletaId: "a2" },
      ],
      error: null,
    });

    const result = await elencaIscrizioniPerAnno(supabase, "anno-1");

    expect(fromMock).toHaveBeenCalledWith("iscrizioni");
    expect(selectMock).toHaveBeenCalledWith("id, atletaId");
    expect(eqAnnoMock).toHaveBeenCalledWith("annoAgonisticoId", "anno-1");
    expect(eqAttivaMock).toHaveBeenCalledWith("attiva", true);
    expect(result).toEqual([
      { id: "isc-1", atletaId: "a1" },
      { id: "isc-2", atletaId: "a2" },
    ]);
  });

  it("throws when the query fails", async () => {
    eqAttivaMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaIscrizioniPerAnno(supabase, "anno-1")).rejects.toThrow(
      "boom"
    );
  });
});

describe("inserisciIscrizione", () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
    updateMock.mockClear();
    updateEqMock.mockClear();
    updateSelectMock.mockReset();
  });

  it("inserts a new Iscrizione row and returns true", async () => {
    insertMock.mockResolvedValue({ error: null });

    const risultato = await inserisciIscrizione(supabase, "atleta-1", "anno-1");

    expect(fromMock).toHaveBeenCalledWith("iscrizioni");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.atletaId).toBe("atleta-1");
    expect(payload.annoAgonisticoId).toBe("anno-1");
    expect(risultato).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("reactivates a previously excluded Iscrizione on conflict and returns true (review fix: chiude il vicolo cieco esclusione-permanente)", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    updateSelectMock.mockResolvedValue({ data: [{ id: "isc-1" }], error: null });

    const risultato = await inserisciIscrizione(supabase, "atleta-1", "anno-1");

    expect(updateMock).toHaveBeenCalledWith({ attiva: true });
    expect(updateEqMock.mock.calls).toEqual([
      ["atletaId", "atleta-1"],
      ["annoAgonisticoId", "anno-1"],
      ["attiva", false],
    ]);
    expect(risultato).toBe(true);
  });

  it("returns false when the existing Iscrizione was already active (true idempotent no-op, AC #4)", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    const risultato = await inserisciIscrizione(supabase, "atleta-1", "anno-1");

    expect(risultato).toBe(false);
  });

  it("throws if the reactivation update itself fails", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    updateSelectMock.mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    await expect(
      inserisciIscrizione(supabase, "atleta-1", "anno-1")
    ).rejects.toThrow("update failed");
  });

  it("throws on any other insert error (not 23505), no reactivation attempted", async () => {
    insertMock.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      inserisciIscrizione(supabase, "atleta-1", "anno-1")
    ).rejects.toThrow("permission denied");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("disattivaIscrizione", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    updateEqMock.mockClear();
    updateSelectMock.mockReset();
  });

  it("sets attiva=false for the given Iscrizione id (AC #4)", async () => {
    updateSelectMock.mockResolvedValue({ data: [{ id: "isc-1" }], error: null });

    await disattivaIscrizione(supabase, "isc-1");

    expect(fromMock).toHaveBeenCalledWith("iscrizioni");
    expect(updateMock).toHaveBeenCalledWith({ attiva: false });
    expect(updateEqMock).toHaveBeenCalledWith("id", "isc-1");
  });

  it("throws when the update fails", async () => {
    updateSelectMock.mockResolvedValue({ data: null, error: { message: "update failed" } });

    await expect(disattivaIscrizione(supabase, "isc-1")).rejects.toThrow(
      "update failed"
    );
  });

  it("throws when no row was actually affected (RLS denial or missing id)", async () => {
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    await expect(disattivaIscrizione(supabase, "isc-1")).rejects.toThrow(
      /nessuna riga/i
    );
  });
});

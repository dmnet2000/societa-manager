import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const upsertMock = vi.fn();
const eqDataMock = vi.fn();
const orderIdMock = vi.fn();
// leggiStoricoPresenzePerAtleta ordina per data, con un secondo .order()
// come spareggio deterministico per righe con la stessa data (Slot diversi
// nello stesso giorno) - senza, l'ordine tra quelle righe sarebbe arbitrario.
const orderMock = vi.fn(() => ({ order: orderIdMock }));
// Il primo .eq() e' condiviso da entrambe le funzioni di lettura: restituisce
// un oggetto che supporta sia un secondo .eq() (leggiPresenzePerSlotEData:
// .eq("slotId").eq("data")) sia .order() (leggiStoricoPresenzePerAtleta:
// .eq("atletaId").order("data").order("id")).
const eqSlotMock = vi.fn(() => ({ eq: eqDataMock, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqSlotMock }));

const fromMock = vi.fn(() => ({
  upsert: upsertMock,
  select: selectMock,
}));

const supabase = { from: fromMock } as never;

const {
  registraPresenze,
  leggiPresenzePerSlotEData,
  leggiStoricoPresenzePerAtleta,
} = await import("./presenza");

describe("registraPresenze", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("upserts a row per Atleta with a generated id, keyed on atletaId+slotId+data (AC #1, #3)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await registraPresenze(supabase, [
      { atletaId: "a1", slotId: "s1", data: "2026-07-13", presente: true },
      { atletaId: "a2", slotId: "s1", data: "2026-07-13", presente: false },
    ]);

    expect(fromMock).toHaveBeenCalledWith("presenze");
    const [righe, opzioni] = upsertMock.mock.calls[0];
    expect(righe).toHaveLength(2);
    expect(righe[0]).toMatchObject({
      atletaId: "a1",
      slotId: "s1",
      data: "2026-07-13",
      presente: true,
    });
    expect(righe[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(righe[1]).toMatchObject({
      atletaId: "a2",
      slotId: "s1",
      data: "2026-07-13",
      presente: false,
    });
    expect(opzioni).toEqual({ onConflict: "atletaId,slotId,data" });
  });

  it("throws when the upsert fails (incluso un rifiuto RLS per AC #4)", async () => {
    upsertMock.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      registraPresenze(supabase, [
        { atletaId: "a1", slotId: "s1", data: "2026-07-13", presente: true },
      ])
    ).rejects.toThrow("row-level security");
  });
});

describe("leggiPresenzePerSlotEData", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqSlotMock.mockClear();
    eqDataMock.mockReset();
  });

  it("returns the presenze already registrate per lo Slot+data indicati (AC #3)", async () => {
    eqDataMock.mockResolvedValue({
      data: [
        { atletaId: "a1", presente: true },
        { atletaId: "a2", presente: false },
      ],
      error: null,
    });

    const result = await leggiPresenzePerSlotEData(supabase, "s1", "2026-07-13");

    expect(fromMock).toHaveBeenCalledWith("presenze");
    expect(selectMock).toHaveBeenCalledWith("atletaId, presente");
    expect(eqSlotMock).toHaveBeenCalledWith("slotId", "s1");
    expect(eqDataMock).toHaveBeenCalledWith("data", "2026-07-13");
    expect(result).toEqual([
      { atletaId: "a1", presente: true },
      { atletaId: "a2", presente: false },
    ]);
  });

  it("throws when the query fails", async () => {
    eqDataMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(
      leggiPresenzePerSlotEData(supabase, "s1", "2026-07-13")
    ).rejects.toThrow("boom");
  });
});

describe("leggiStoricoPresenzePerAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqSlotMock.mockClear();
    orderMock.mockClear();
    orderIdMock.mockReset();
  });

  it("returns lo storico presenze dell'Atleta in ordine cronologico, con spareggio deterministico per data uguale (AC #1)", async () => {
    orderIdMock.mockResolvedValue({
      data: [
        { id: "p1", slotId: "s1", data: "2026-07-06", presente: true },
        { id: "p2", slotId: "s1", data: "2026-07-13", presente: false },
      ],
      error: null,
    });

    const result = await leggiStoricoPresenzePerAtleta(supabase, "a1");

    expect(fromMock).toHaveBeenCalledWith("presenze");
    expect(selectMock).toHaveBeenCalledWith("id, slotId, data, presente");
    expect(eqSlotMock).toHaveBeenCalledWith("atletaId", "a1");
    expect(orderMock).toHaveBeenCalledWith("data", { ascending: true });
    expect(orderIdMock).toHaveBeenCalledWith("id", { ascending: true });
    expect(result).toEqual([
      { id: "p1", slotId: "s1", data: "2026-07-06", presente: true },
      { id: "p2", slotId: "s1", data: "2026-07-13", presente: false },
    ]);
  });

  it("throws when the query fails", async () => {
    orderIdMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(
      leggiStoricoPresenzePerAtleta(supabase, "a1")
    ).rejects.toThrow("boom");
  });
});

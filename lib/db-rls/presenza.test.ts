import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const upsertMock = vi.fn();
const eqDataMock = vi.fn();
const eqSlotMock = vi.fn(() => ({ eq: eqDataMock }));
const selectMock = vi.fn(() => ({ eq: eqSlotMock }));

const fromMock = vi.fn(() => ({
  upsert: upsertMock,
  select: selectMock,
}));

const supabase = { from: fromMock } as never;

const { registraPresenze, leggiPresenzePerSlotEData } = await import(
  "./presenza"
);

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

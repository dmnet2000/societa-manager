import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const supabase = { from: fromMock } as never;

const { inserisciMisurazione } = await import("./misurazione-atleta");

beforeEach(() => {
  fromMock.mockClear();
  insertMock.mockReset();
});

describe("inserisciMisurazione", () => {
  it("inserts a single row when given one valore (comportamento invariato, Story 6.1)", async () => {
    insertMock.mockResolvedValue({ error: null });

    await inserisciMisurazione(supabase, "atleta-1", {
      tipo: "Altezza",
      valori: [178],
      unitaMisura: "cm",
      data: "2026-07-31",
    });

    expect(fromMock).toHaveBeenCalledWith("misurazioni_atleta");
    const righe = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(righe).toHaveLength(1);
    expect(righe[0]).toMatchObject({
      atletaId: "atleta-1",
      tipo: "Altezza",
      valore: 178,
      unitaMisura: "cm",
      data: "2026-07-31",
    });
    expect(righe[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("inserts one row per valore, stesso tipo/data/unitaMisura, id distinti (Story 9.16 AC #3)", async () => {
    insertMock.mockResolvedValue({ error: null });

    await inserisciMisurazione(supabase, "atleta-1", {
      tipo: "Salto con rincorsa",
      valori: [40, 42, 38],
      unitaMisura: "cm",
      data: "2026-07-31",
    });

    const righe = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(righe).toHaveLength(3);
    expect(righe.map((r) => r.valore)).toEqual([40, 42, 38]);
    expect(righe.every((r) => r.tipo === "Salto con rincorsa")).toBe(true);
    expect(righe.every((r) => r.data === "2026-07-31")).toBe(true);
    const idsDistinti = new Set(righe.map((r) => r.id));
    expect(idsDistinti.size).toBe(3);
  });

  it("throws when the insert fails, no partial write assumed by the caller", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(
      inserisciMisurazione(supabase, "atleta-1", {
        tipo: "Peso",
        valori: [55],
        unitaMisura: "kg",
        data: "2026-07-31",
      })
    ).rejects.toThrow("insert failed");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn(() => ({ select: selectMock }));
const updateMock = vi.fn<(payload: Record<string, unknown>) => { eq: typeof eqMock }>(
  () => ({ eq: eqMock })
);
const orderMock = vi.fn();
const elencoSelectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({
  insert: insertMock,
  update: updateMock,
  select: elencoSelectMock,
}));

const supabase = { from: fromMock } as never;

const { creaAtleta, aggiornaAtleta, elencaAtlete } = await import("./atleta");

const datiEsempio = {
  codiceFiscale: "ABC123",
  nome: "Mario Rossi",
  sesso: "M" as const,
  dataNascita: new Date("2010-05-01"),
};

describe("creaAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
  });

  it("inserts a new Atleta generating id/updatedAt (not DB-level defaults via supabase-js) and returns the generated id (Story 1.7)", async () => {
    insertMock.mockResolvedValue({ error: null });

    const id = await creaAtleta(supabase, datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(id).toBe(payload.id);
    expect(payload.codiceFiscale).toBe("ABC123");
    expect(payload.dataNascita).toBe("2010-05-01T00:00:00.000Z");
    expect(typeof payload.updatedAt).toBe("string");
  });

  it("throws when the insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(creaAtleta(supabase, datiEsempio)).rejects.toThrow(
      "insert failed"
    );
  });
});

describe("aggiornaAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    selectMock.mockReset();
  });

  it("updates only the identity fields for the given id", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await aggiornaAtleta(supabase, "a1", datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(eqMock).toHaveBeenCalledWith("id", "a1");
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.codiceFiscale).toBe("ABC123");
    expect(payload.dataNascita).toBe("2010-05-01T00:00:00.000Z");
  });

  it("throws when the update fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    await expect(aggiornaAtleta(supabase, "a1", datiEsempio)).rejects.toThrow(
      "update failed"
    );
  });

  it("throws when no row was actually affected (RLS denial or missing id, review fix)", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(aggiornaAtleta(supabase, "a1", datiEsempio)).rejects.toThrow(
      /nessuna riga/i
    );
  });
});

describe("elencaAtlete", () => {
  beforeEach(() => {
    fromMock.mockClear();
    elencoSelectMock.mockClear();
    orderMock.mockReset();
  });

  it("returns Atlete ordered by nome, including categoria (Story 1.6/1.8)", async () => {
    const atlete = [
      { id: "a1", nome: "Bianchi Laura", codiceFiscale: "AAA", categoria: "Under 13" },
      { id: "a2", nome: "Rossi Mario", codiceFiscale: "BBB", categoria: "Under 16" },
    ];
    orderMock.mockResolvedValue({ data: atlete, error: null });

    const result = await elencaAtlete(supabase);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(elencoSelectMock).toHaveBeenCalledWith(
      "id, nome, codiceFiscale, categoria"
    );
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
    expect(result).toEqual(atlete);
  });

  it("throws when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaAtlete(supabase)).rejects.toThrow("boom");
  });
});

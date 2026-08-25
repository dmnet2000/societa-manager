import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: {
      findMany: findManyMock,
      update: updateMock,
    },
    $transaction: transactionMock,
  },
}));

const { elencaGruppiOrdinati, riordinaGruppi } = await import("./ordine-squadre");

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset();
  transactionMock.mockReset();
});

describe("elencaGruppiOrdinati", () => {
  it("returns i Gruppi della stagione data, ordinati per ordine ascendente", async () => {
    const righe = [{ id: "1", ordine: 0 }];
    findManyMock.mockResolvedValue(righe);

    const result = await elencaGruppiOrdinati("anno-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1" },
      orderBy: [{ ordine: "asc" }, { nome: "asc" }],
    });
    expect(result).toBe(righe);
  });
});

describe("riordinaGruppi", () => {
  it("writes ordine = indice nell'array, in una singola transazione", async () => {
    await riordinaGruppi(["c", "a", "b"]);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    const chiamate = transactionMock.mock.calls[0][0];
    expect(chiamate).toHaveLength(3);
    expect(updateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "c" },
      data: { ordine: 0 },
    });
    expect(updateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "a" },
      data: { ordine: 1 },
    });
    expect(updateMock).toHaveBeenNthCalledWith(3, {
      where: { id: "b" },
      data: { ordine: 2 },
    });
  });
});

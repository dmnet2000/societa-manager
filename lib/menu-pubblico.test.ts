import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const aggregateMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    voceMenuPubblico: {
      findMany: findManyMock,
      aggregate: aggregateMock,
      create: createMock,
      update: updateMock,
    },
    $transaction: transactionMock,
  },
}));

const {
  elencaVociMenuPubblico,
  creaVoceMenuPubblico,
  aggiornaVoceMenuPubblico,
  impostaVisibileVoceMenuPubblico,
  riordinaVociMenuPubblico,
} = await import("./menu-pubblico");

beforeEach(() => {
  findManyMock.mockReset();
  aggregateMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  transactionMock.mockReset();
});

describe("elencaVociMenuPubblico", () => {
  it("returns all rows ordered by ordine ascending", async () => {
    const righe = [{ id: "1", ordine: 0 }];
    findManyMock.mockResolvedValue(righe);

    const result = await elencaVociMenuPubblico();

    expect(findManyMock).toHaveBeenCalledWith({ orderBy: { ordine: "asc" } });
    expect(result).toBe(righe);
  });
});

describe("creaVoceMenuPubblico", () => {
  it("assigns ordine = max esistente + 1", async () => {
    aggregateMock.mockResolvedValue({ _max: { ordine: 4 } });
    const nuovaRiga = { id: "nuovo", etichetta: "Foo", url: "/foo", ordine: 5 };
    createMock.mockResolvedValue(nuovaRiga);

    const result = await creaVoceMenuPubblico({ etichetta: "Foo", url: "/foo" });

    expect(aggregateMock).toHaveBeenCalledWith({ _max: { ordine: true } });
    expect(createMock).toHaveBeenCalledWith({
      data: { etichetta: "Foo", url: "/foo", ordine: 5 },
    });
    expect(result).toBe(nuovaRiga);
  });

  it("assigns ordine = 0 quando la tabella e' vuota (nessuna riga esistente)", async () => {
    aggregateMock.mockResolvedValue({ _max: { ordine: null } });
    createMock.mockResolvedValue({});

    await creaVoceMenuPubblico({ etichetta: "Home", url: "/" });

    expect(createMock).toHaveBeenCalledWith({
      data: { etichetta: "Home", url: "/", ordine: 0 },
    });
  });
});

describe("aggiornaVoceMenuPubblico", () => {
  it("updates etichetta/url by id", async () => {
    await aggiornaVoceMenuPubblico("v1", { etichetta: "Nuova", url: "/nuova" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { etichetta: "Nuova", url: "/nuova" },
    });
  });
});

describe("impostaVisibileVoceMenuPubblico", () => {
  it("updates visibile by id (nascondi)", async () => {
    await impostaVisibileVoceMenuPubblico("v1", false);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { visibile: false },
    });
  });

  it("updates visibile by id (mostra)", async () => {
    await impostaVisibileVoceMenuPubblico("v1", true);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { visibile: true },
    });
  });
});

describe("riordinaVociMenuPubblico", () => {
  it("writes ordine = indice nell'array, in una singola transazione", async () => {
    await riordinaVociMenuPubblico(["c", "a", "b"]);

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

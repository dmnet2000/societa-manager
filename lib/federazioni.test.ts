import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const aggregateMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    federazione: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      aggregate: aggregateMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
    $transaction: transactionMock,
  },
}));

const {
  elencaFederazioni,
  trovaFederazionePerNomeInsensitive,
  creaFederazione,
  aggiornaFederazione,
  impostaAttivaFederazione,
  riordinaFederazioni,
  eliminaFederazione,
} = await import("./federazioni");

beforeEach(() => {
  for (const mock of [
    findManyMock,
    findFirstMock,
    aggregateMock,
    createMock,
    updateMock,
    deleteMock,
    transactionMock,
  ]) {
    mock.mockReset();
  }
});

describe("elencaFederazioni", () => {
  it("ordina per ordine con spareggio stabile su createdAt e id", async () => {
    findManyMock.mockResolvedValue([]);
    await elencaFederazioni();
    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: [{ ordine: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  });
});

describe("trovaFederazionePerNomeInsensitive", () => {
  it("cerca il nome senza distinzione maiuscole/minuscole", async () => {
    findFirstMock.mockResolvedValue(null);
    await trovaFederazionePerNomeInsensitive("fipav");
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { nome: { equals: "fipav", mode: "insensitive" } },
    });
  });

  it("esclude la Federazione indicata quando escludiId e' valorizzato", async () => {
    findFirstMock.mockResolvedValue(null);
    await trovaFederazionePerNomeInsensitive("Fipav", "a");
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { nome: { equals: "Fipav", mode: "insensitive" }, id: { not: "a" } },
    });
  });
});

describe("creaFederazione", () => {
  it("mette la nuova Federazione in coda (max ordine + 1)", async () => {
    aggregateMock.mockResolvedValue({ _max: { ordine: 2 } });
    await creaFederazione({ nome: "CSI", sigla: "CSI" });
    expect(createMock).toHaveBeenCalledWith({
      data: { nome: "CSI", sigla: "CSI", ordine: 3 },
    });
  });

  it("usa ordine 0 su tabella vuota", async () => {
    aggregateMock.mockResolvedValue({ _max: { ordine: null } });
    await creaFederazione({ nome: "CSI", sigla: null });
    expect(createMock).toHaveBeenCalledWith({
      data: { nome: "CSI", sigla: null, ordine: 0 },
    });
  });
});

describe("scritture semplici", () => {
  it("aggiornaFederazione aggiorna nome e sigla", async () => {
    await aggiornaFederazione("a", { nome: "Fipav", sigla: null });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { nome: "Fipav", sigla: null },
    });
  });

  it("impostaAttivaFederazione aggiorna solo attiva", async () => {
    await impostaAttivaFederazione("a", false);
    expect(updateMock).toHaveBeenCalledWith({ where: { id: "a" }, data: { attiva: false } });
  });

  it("eliminaFederazione cancella per id", async () => {
    await eliminaFederazione("a");
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "a" } });
  });
});

describe("riordinaFederazioni", () => {
  it("assegna a ogni id il proprio indice dentro una transazione", async () => {
    updateMock.mockImplementation((args) => args);
    await riordinaFederazioni(["b", "a", "c"]);
    expect(transactionMock).toHaveBeenCalledWith([
      { where: { id: "b" }, data: { ordine: 0 } },
      { where: { id: "a" }, data: { ordine: 1 } },
      { where: { id: "c" }, data: { ordine: 2 } },
    ]);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const updateMock = vi.fn();
const campionatoUpdateMock = vi.fn();
const campionatoFindFirstMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: {
      findMany: findManyMock,
      update: updateMock,
    },
    campionato: {
      update: campionatoUpdateMock,
      findFirst: campionatoFindFirstMock,
    },
    $transaction: transactionMock,
  },
}));

const {
  elencaGruppiOrdinati,
  riordinaGruppi,
  impostaVisibilitaGruppo,
  impostaVisibilitaClassifica,
  campionatoConClassificaInStagione,
} = await import("./ordine-squadre");

beforeEach(() => {
  findManyMock.mockReset();
  updateMock.mockReset();
  campionatoUpdateMock.mockReset();
  campionatoFindFirstMock.mockReset();
  transactionMock.mockReset();
});

describe("elencaGruppiOrdinati", () => {
  it("returns i Gruppi della stagione data, ordinati per ordine ascendente, con i Campionati con link FIPAV (Story 19.17)", async () => {
    const righe = [{ id: "1", ordine: 0 }];
    findManyMock.mockResolvedValue(righe);

    const result = await elencaGruppiOrdinati("anno-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1" },
      orderBy: [{ ordine: "asc" }, { nome: "asc" }],
      include: {
        campionati: {
          where: { linkFipav: { not: null } },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true, classificaVisibile: true },
        },
      },
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

describe("impostaVisibilitaGruppo", () => {
  it("writes visibilePubblico = true per l'id dato", async () => {
    await impostaVisibilitaGruppo("a", true);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { visibilePubblico: true },
    });
  });

  it("writes visibilePubblico = false per l'id dato", async () => {
    await impostaVisibilitaGruppo("a", false);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { visibilePubblico: false },
    });
  });
});

describe("impostaVisibilitaClassifica", () => {
  it("writes classificaVisibile = false per il Campionato dato", async () => {
    await impostaVisibilitaClassifica("c1", false);

    expect(campionatoUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { classificaVisibile: false },
    });
  });

  it("writes classificaVisibile = true per il Campionato dato", async () => {
    await impostaVisibilitaClassifica("c1", true);

    expect(campionatoUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { classificaVisibile: true },
    });
  });
});

describe("campionatoConClassificaInStagione", () => {
  it("cerca il Campionato per id, stagione e link FIPAV non nullo - true se trovato", async () => {
    campionatoFindFirstMock.mockResolvedValue({ id: "c1" });

    const result = await campionatoConClassificaInStagione("c1", "anno-1");

    expect(campionatoFindFirstMock).toHaveBeenCalledWith({
      where: { id: "c1", annoAgonisticoId: "anno-1", linkFipav: { not: null } },
      select: { id: true },
    });
    expect(result).toBe(true);
  });

  it("returns false se non trovato (altra stagione, senza link FIPAV o inesistente)", async () => {
    campionatoFindFirstMock.mockResolvedValue(null);

    expect(await campionatoConClassificaInStagione("c1", "anno-1")).toBe(false);
  });
});

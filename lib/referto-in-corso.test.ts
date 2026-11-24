import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const queryRawMock = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRawMock } }));

const { salvaRisultatoSet } = await import("./referto-in-corso");

const RICHIESTA = {
  registroId: "123e4567-e89b-42d3-a456-426614174000",
  casa: 25,
  ospite: 20,
  seqFinale: 50,
};

describe("salvaRisultatoSet", () => {
  beforeEach(() => vi.resetAllMocks());

  it("restituisce la riga scritta dall'upsert, con parametri e non testo concatenato", async () => {
    queryRawMock.mockResolvedValueOnce([{ numeroSet: 1, casa: 25, ospite: 20, seqFinale: 50 }]);

    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).resolves.toEqual({
      numeroSet: 1,
      casa: 25,
      ospite: 20,
      seqFinale: 50,
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const [stringhe, ...valori] = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    expect(valori).toEqual(["p-1", 1, 25, 20, 50, RICHIESTA.registroId, 2]);
    const sql = stringhe.join("?");
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain('EXCLUDED."seqFinale" > "risultati_set_referto"."seqFinale"');
  });

  it("con un invio vecchio legge e restituisce la riga salvata", async () => {
    queryRawMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ numeroSet: 1, casa: 25, ospite: 23, seqFinale: 90 }]);

    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).resolves.toEqual({
      numeroSet: 1,
      casa: 25,
      ospite: 23,
      seqFinale: 90,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });

  it("lancia se la riga non esiste nemmeno dopo l'upsert", async () => {
    queryRawMock.mockResolvedValue([]);
    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).rejects.toThrow();
  });
});

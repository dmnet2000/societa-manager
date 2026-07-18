import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    utente: {
      findMany: findManyMock,
    },
  },
}));

const { elencaEmailPerRuolo } = await import("./email-per-ruolo");

describe("elencaEmailPerRuolo", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("restituisce le email degli Utenti attivi con il Ruolo indicato (AC #1)", async () => {
    findManyMock.mockResolvedValue([
      { email: "segreteria1@esempio.it" },
      { email: "segreteria2@esempio.it" },
    ]);

    const risultato = await elencaEmailPerRuolo("SEGRETERIA");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { attivo: true, ruoli: { some: { ruolo: "SEGRETERIA" } } },
      select: { email: true },
    });
    expect(risultato).toEqual([
      "segreteria1@esempio.it",
      "segreteria2@esempio.it",
    ]);
  });

  it("restituisce un array vuoto quando nessun Utente ha quel Ruolo (AC #5), mai un errore", async () => {
    findManyMock.mockResolvedValue([]);

    const risultato = await elencaEmailPerRuolo("SEGRETERIA");

    expect(risultato).toEqual([]);
  });
});

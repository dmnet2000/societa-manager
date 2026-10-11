import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const gruppoAtletaFindManyMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppoAtleta: {
      findMany: gruppoAtletaFindManyMock,
    },
  },
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

const { elencaNomiGruppiAtletaCorrenti } = await import("./nomi-gruppi-atleta");

describe("elencaNomiGruppiAtletaCorrenti", () => {
  beforeEach(() => {
    gruppoAtletaFindManyMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockReset();
  });

  it("restituisce i nomi di tutti i Gruppi dell'Atleta nella stagione corrente (Story 4.7)", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoAtletaFindManyMock.mockResolvedValue([
      { gruppo: { nome: "Under 14" } },
      { gruppo: { nome: "Under 16" } },
    ]);

    const nomi = await elencaNomiGruppiAtletaCorrenti("atleta-1");

    expect(nomi).toEqual(["Under 14", "Under 16"]);
    expect(gruppoAtletaFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      })
    );
  });

  it("restituisce [] senza interrogare GruppoAtleta se non esiste un Anno Agonistico corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const nomi = await elencaNomiGruppiAtletaCorrenti("atleta-1");

    expect(nomi).toEqual([]);
    expect(gruppoAtletaFindManyMock).not.toHaveBeenCalled();
  });
});

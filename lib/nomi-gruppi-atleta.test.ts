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

const { elencaNomiGruppiPerAtletaCorrenti } = await import("./nomi-gruppi-atleta");

describe("elencaNomiGruppiPerAtletaCorrenti", () => {
  beforeEach(() => {
    gruppoAtletaFindManyMock.mockReset();
    trovaAnnoAgonisticoCorrenteMock.mockReset();
  });

  it("raggruppa i nomi dei Gruppi della stagione corrente per Atleta (Story 28.1)", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoAtletaFindManyMock.mockResolvedValue([
      { atletaId: "a1", gruppo: { nome: "Under 14" } },
      { atletaId: "a2", gruppo: { nome: "Under 14" } },
      { atletaId: "a1", gruppo: { nome: "Under 16" } },
    ]);

    const mappa = await elencaNomiGruppiPerAtletaCorrenti();

    expect(mappa.get("a1")).toEqual(["Under 14", "Under 16"]);
    expect(mappa.get("a2")).toEqual(["Under 14"]);
    expect(gruppoAtletaFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { annoAgonisticoId: "anno-1" } })
    );
  });

  // Review fix (code review Epic 28): ordine alfabetico in memoria, come
  // /app/conferma-iscrizioni, indipendente dall'ordine delle righe.
  it("ordina i nomi dei Gruppi di ogni Atleta con localeCompare, qualunque sia l'ordine delle righe", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    gruppoAtletaFindManyMock.mockResolvedValue([
      { atletaId: "a1", gruppo: { nome: "Under 16" } },
      { atletaId: "a1", gruppo: { nome: "amatori" } },
      { atletaId: "a1", gruppo: { nome: "Under 14" } },
    ]);

    const mappa = await elencaNomiGruppiPerAtletaCorrenti();

    expect(mappa.get("a1")).toEqual(["amatori", "Under 14", "Under 16"]);
  });

  it("senza Anno Agonistico corrente restituisce una mappa vuota senza interrogare i Gruppi", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const mappa = await elencaNomiGruppiPerAtletaCorrenti();

    expect(mappa.size).toBe(0);
    expect(gruppoAtletaFindManyMock).not.toHaveBeenCalled();
  });
});

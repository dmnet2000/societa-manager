import { describe, expect, it } from "vitest";
import { raggruppaPartitePerGruppo } from "./raggruppa-partite-per-gruppo";

type PartitaDiTest = {
  id: string;
  gruppoId: string;
  gruppo: { nome: string; ordine: number };
};

function partita(
  id: string,
  gruppoId: string,
  gruppoNome: string,
  ordine = 0
): PartitaDiTest {
  return { id, gruppoId, gruppo: { nome: gruppoNome, ordine } };
}

describe("raggruppaPartitePerGruppo", () => {
  it("ritorna un array vuoto se non ci sono partite", () => {
    expect(raggruppaPartitePerGruppo([])).toEqual([]);
  });

  it("raggruppa le partite di un solo Gruppo in un unico elemento", () => {
    const risultato = raggruppaPartitePerGruppo([
      partita("p1", "g1", "Under 13"),
      partita("p2", "g1", "Under 13"),
    ]);

    expect(risultato).toHaveLength(1);
    expect(risultato[0].gruppoId).toBe("g1");
    expect(risultato[0].gruppoNome).toBe("Under 13");
    expect(risultato[0].partite.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("raggruppa correttamente le partite di più Gruppi mescolate nell'array in input", () => {
    const risultato = raggruppaPartitePerGruppo([
      partita("p1", "g1", "Under 13"),
      partita("p2", "g2", "Under 15"),
      partita("p3", "g1", "Under 13"),
    ]);

    expect(risultato).toHaveLength(2);
    const under13 = risultato.find((g) => g.gruppoId === "g1");
    const under15 = risultato.find((g) => g.gruppoId === "g2");
    expect(under13?.partite.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(under15?.partite.map((p) => p.id)).toEqual(["p2"]);
  });

  it("ordina i Gruppi per Gruppo.ordine (stesso criterio di elencaGruppiOrdinati, Story 19.15), non alfabeticamente né per ordine di prima apparizione", () => {
    const risultato = raggruppaPartitePerGruppo([
      partita("p1", "g-under15", "Under 15", 1),
      partita("p2", "g-under9", "Under 9", 0),
    ]);

    expect(risultato.map((g) => g.gruppoNome)).toEqual(["Under 9", "Under 15"]);
  });

  it("usa il nome come spareggio quando due Gruppi condividono lo stesso ordine", () => {
    const risultato = raggruppaPartitePerGruppo([
      partita("p1", "g-b", "Under 15 B", 0),
      partita("p2", "g-a", "Under 15 A", 0),
    ]);

    expect(risultato.map((g) => g.gruppoNome)).toEqual(["Under 15 A", "Under 15 B"]);
  });

  it("conserva l'ordine relativo delle partite all'interno di ciascun Gruppo (stesso ordine dell'array in input)", () => {
    const risultato = raggruppaPartitePerGruppo([
      partita("prima", "g1", "Under 13"),
      partita("seconda", "g1", "Under 13"),
      partita("terza", "g1", "Under 13"),
    ]);

    expect(risultato[0].partite.map((p) => p.id)).toEqual(["prima", "seconda", "terza"]);
  });
});

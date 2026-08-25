import { describe, expect, it } from "vitest";
import { raggruppaGruppiPerCategoriaContigua } from "./raggruppa-gruppi-per-categoria";

describe("raggruppaGruppiPerCategoriaContigua", () => {
  it("returns an empty array when there are no gruppi", () => {
    expect(raggruppaGruppiPerCategoriaContigua([])).toEqual([]);
  });

  it("groups consecutive gruppi of the same categoria into a single block", () => {
    const gruppi = [
      { id: "1", categoria: "Under 14" },
      { id: "2", categoria: "Under 14" },
      { id: "3", categoria: "Serie D" },
    ];

    const result = raggruppaGruppiPerCategoriaContigua(gruppi);

    expect(result).toEqual([
      { categoria: "Under 14", gruppi: [gruppi[0], gruppi[1]] },
      { categoria: "Serie D", gruppi: [gruppi[2]] },
    ]);
  });

  it("returns one block per gruppo when every categoria differs from its predecessor", () => {
    const gruppi = [
      { id: "1", categoria: "Under 14" },
      { id: "2", categoria: "Serie D" },
      { id: "3", categoria: "Under 16" },
    ];

    const result = raggruppaGruppiPerCategoriaContigua(gruppi);

    expect(result).toEqual([
      { categoria: "Under 14", gruppi: [gruppi[0]] },
      { categoria: "Serie D", gruppi: [gruppi[1]] },
      { categoria: "Under 16", gruppi: [gruppi[2]] },
    ]);
  });

  // I/O matrix (spec-18-24/spec-19-15): la stessa categoria che riappare
  // NON contigua nell'ordine forma un blocco separato con la stessa
  // intestazione - comportamento accettato, non un bug (l'ordine e' una
  // scelta libera del Site Manager, nessuna lista di categorie fissata).
  it("creates a separate block when the same categoria reappears non-contiguously (I/O matrix)", () => {
    const gruppi = [
      { id: "1", categoria: "Serie D" },
      { id: "2", categoria: "Under 14" },
      { id: "3", categoria: "Serie D" },
    ];

    const result = raggruppaGruppiPerCategoriaContigua(gruppi);

    expect(result).toEqual([
      { categoria: "Serie D", gruppi: [gruppi[0]] },
      { categoria: "Under 14", gruppi: [gruppi[1]] },
      { categoria: "Serie D", gruppi: [gruppi[2]] },
    ]);
  });

  it("returns a single block when every gruppo shares the same categoria", () => {
    const gruppi = [
      { id: "1", categoria: "Under 14" },
      { id: "2", categoria: "Under 14" },
      { id: "3", categoria: "Under 14" },
    ];

    const result = raggruppaGruppiPerCategoriaContigua(gruppi);

    expect(result).toEqual([{ categoria: "Under 14", gruppi }]);
  });
});

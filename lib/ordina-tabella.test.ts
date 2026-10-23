import { describe, expect, it } from "vitest";
import {
  ordinaRigheTabella,
  prossimoOrdinamentoTabella,
  type ValoreOrdinamento,
} from "./ordina-tabella";

function riga(id: string, ...valori: ValoreOrdinamento[]) {
  return { id, valori };
}

function ids(righe: { id: string }[]) {
  return righe.map((r) => r.id);
}

describe("prossimoOrdinamentoTabella", () => {
  it("starts ascending on a new column", () => {
    expect(prossimoOrdinamentoTabella(null, 2)).toEqual({ colonna: 2, direzione: "asc" });
    expect(prossimoOrdinamentoTabella({ colonna: 1, direzione: "desc" }, 2)).toEqual({
      colonna: 2,
      direzione: "asc",
    });
  });

  it("toggles the direction on the same column", () => {
    expect(prossimoOrdinamentoTabella({ colonna: 0, direzione: "asc" }, 0)).toEqual({
      colonna: 0,
      direzione: "desc",
    });
    expect(prossimoOrdinamentoTabella({ colonna: 0, direzione: "desc" }, 0)).toEqual({
      colonna: 0,
      direzione: "asc",
    });
  });
});

describe("ordinaRigheTabella", () => {
  it("keeps the original order (same array) when no column is selected", () => {
    const righe = [riga("b", "B"), riga("a", "A")];
    expect(ordinaRigheTabella(righe, null)).toBe(righe);
  });

  it("sorts text alphabetically (Italian, case/accent-insensitive, numeric-aware)", () => {
    const righe = [riga("1", "Under 14"), riga("2", "under 8"), riga("3", "Àlfa"), riga("4", "Under 10")];
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "asc" }))).toEqual([
      "3",
      "2",
      "4",
      "1",
    ]);
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "desc" }))).toEqual([
      "1",
      "4",
      "2",
      "3",
    ]);
  });

  it("sorts numbers by value, not as text", () => {
    const righe = [riga("a", 10), riga("b", 9), riga("c", 100)];
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "asc" }))).toEqual(["b", "a", "c"]);
  });

  it("keeps missing values last in both directions", () => {
    const righe = [riga("a", null), riga("b", 2), riga("c", ""), riga("d", 1), riga("e", undefined)];
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "asc" }))).toEqual([
      "d",
      "b",
      "a",
      "c",
      "e",
    ]);
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "desc" }))).toEqual([
      "b",
      "d",
      "a",
      "c",
      "e",
    ]);
  });

  it("keeps the original order for equal values (stable)", () => {
    const righe = [riga("a", "x", 1), riga("b", "x", 2), riga("c", "x", 3)];
    expect(ids(ordinaRigheTabella(righe, { colonna: 0, direzione: "desc" }))).toEqual(["a", "b", "c"]);
  });

  it("uses the requested column", () => {
    const righe = [riga("a", "z", 1), riga("b", "a", 2)];
    expect(ids(ordinaRigheTabella(righe, { colonna: 1, direzione: "desc" }))).toEqual(["b", "a"]);
  });
});

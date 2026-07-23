import { describe, expect, it } from "vitest";
import { calcolaCoordinateGrafico } from "./calcola-coordinate-grafico";

const DIMENSIONI = { larghezza: 280, altezza: 120, padding: 24 };

describe("calcolaCoordinateGrafico", () => {
  it("restituisce array vuoto per input vuoto", () => {
    expect(calcolaCoordinateGrafico([], DIMENSIONI)).toEqual([]);
  });

  it("posiziona due punti agli estremi orizzontali disponibili (spaziatura per indice)", () => {
    const risultato = calcolaCoordinateGrafico([10, 20], DIMENSIONI);
    expect(risultato).toHaveLength(2);
    expect(risultato[0].x).toBe(DIMENSIONI.padding);
    expect(risultato[1].x).toBe(DIMENSIONI.larghezza - DIMENSIONI.padding);
  });

  it("un valore piu' alto produce una coordinata y piu' bassa (origine SVG in alto a sinistra)", () => {
    const risultato = calcolaCoordinateGrafico([10, 20], DIMENSIONI);
    expect(risultato[1].y).toBeLessThan(risultato[0].y);
  });

  it("un andamento decrescente produce una coordinata y crescente", () => {
    const risultato = calcolaCoordinateGrafico([20, 10], DIMENSIONI);
    expect(risultato[1].y).toBeGreaterThan(risultato[0].y);
  });

  it("valori tutti uguali produce una linea orizzontale piatta a meta' altezza (nessuna divisione per zero)", () => {
    const risultato = calcolaCoordinateGrafico([5, 5, 5], DIMENSIONI);
    const metaAltezza = DIMENSIONI.altezza / 2;
    expect(risultato.every((p) => p.y === metaAltezza)).toBe(true);
    expect(Number.isFinite(risultato[0].y)).toBe(true);
  });

  it("un singolo valore produce un solo punto al padding sinistro, a meta' altezza (nessuna divisione per zero)", () => {
    const risultato = calcolaCoordinateGrafico([42], DIMENSIONI);
    expect(risultato).toEqual([{ x: DIMENSIONI.padding, y: DIMENSIONI.altezza / 2 }]);
  });

  it("distribuisce N punti equidistanti tra il padding sinistro e destro", () => {
    const risultato = calcolaCoordinateGrafico([1, 2, 3, 4], DIMENSIONI);
    expect(risultato).toHaveLength(4);
    expect(risultato[0].x).toBe(DIMENSIONI.padding);
    expect(risultato[3].x).toBe(DIMENSIONI.larghezza - DIMENSIONI.padding);
    const passo = risultato[1].x - risultato[0].x;
    expect(risultato[2].x - risultato[1].x).toBeCloseTo(passo);
    expect(risultato[3].x - risultato[2].x).toBeCloseTo(passo);
  });
});

import { describe, expect, it } from "vitest";
import { raggruppaPerTipo } from "./raggruppa-per-tipo";
import type { Misurazione } from "@/lib/db-rls/misurazione-atleta";

function m(id: string, tipo: string, valore: number, unitaMisura: string, data: string): Misurazione {
  return { id, tipo, valore, unitaMisura, data };
}

describe("raggruppaPerTipo", () => {
  it("restituisce array vuoto per input vuoto (AC #4)", () => {
    expect(raggruppaPerTipo([])).toEqual([]);
  });

  it("esclude i tipi con una sola misurazione (AC #3)", () => {
    const risultato = raggruppaPerTipo([m("1", "Salto in alto", 1.5, "m", "2026-01-01")]);
    expect(risultato).toEqual([]);
  });

  it("raggruppa più tipi con almeno due misurazioni ciascuno (AC #1, #2)", () => {
    const misurazioni = [
      m("1", "Altezza", 170, "cm", "2026-01-01"),
      m("2", "Peso", 55, "kg", "2026-01-05"),
      m("3", "Altezza", 172, "cm", "2026-02-01"),
      m("4", "Peso", 56, "kg", "2026-02-05"),
    ];
    const risultato = raggruppaPerTipo(misurazioni);
    expect(risultato).toEqual([
      { tipo: "Altezza", unitaMisura: "cm", punti: [misurazioni[0], misurazioni[2]] },
      { tipo: "Peso", unitaMisura: "kg", punti: [misurazioni[1], misurazioni[3]] },
    ]);
  });

  it("preserva l'ordine di prima comparsa quando i tipi si alternano nello storico", () => {
    const misurazioni = [
      m("1", "Peso", 55, "kg", "2026-01-01"),
      m("2", "Altezza", 170, "cm", "2026-01-05"),
      m("3", "Peso", 56, "kg", "2026-02-01"),
      m("4", "Altezza", 172, "cm", "2026-02-05"),
    ];
    const risultato = raggruppaPerTipo(misurazioni);
    expect(risultato.map((g) => g.tipo)).toEqual(["Peso", "Altezza"]);
  });

  it("usa l'unitaMisura della prima misurazione incontrata per quel tipo", () => {
    const misurazioni = [
      m("1", "Altezza", 170, "cm", "2026-01-01"),
      m("2", "Altezza", 172, "CM", "2026-02-01"),
    ];
    const risultato = raggruppaPerTipo(misurazioni);
    expect(risultato[0].unitaMisura).toBe("cm");
  });

  it("tratta 'tipo' con maiuscole/spazi diversi come lo stesso gruppo (review fix)", () => {
    const misurazioni = [
      m("1", "Altezza", 170, "cm", "2026-01-01"),
      m("2", " altezza ", 172, "cm", "2026-02-01"),
      m("3", "ALTEZZA", 174, "cm", "2026-03-01"),
    ];
    const risultato = raggruppaPerTipo(misurazioni);
    expect(risultato).toHaveLength(1);
    expect(risultato[0].tipo).toBe("Altezza");
    expect(risultato[0].punti).toHaveLength(3);
  });

  it("esclude un tipo con una sola misurazione anche quando altri tipi qualificano", () => {
    const misurazioni = [
      m("1", "Altezza", 170, "cm", "2026-01-01"),
      m("2", "Altezza", 172, "cm", "2026-02-01"),
      m("3", "Salto in alto", 1.5, "m", "2026-01-15"),
    ];
    const risultato = raggruppaPerTipo(misurazioni);
    expect(risultato.map((g) => g.tipo)).toEqual(["Altezza"]);
  });
});

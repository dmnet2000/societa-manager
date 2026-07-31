import { describe, expect, it } from "vitest";
import { riduciMiglioreProData } from "./riduci-migliore-per-data";
import type { Misurazione } from "@/lib/db-rls/misurazione-atleta";

function m(id: string, valore: number, data: string): Misurazione {
  return { id, tipo: "Salto con rincorsa", valore, unitaMisura: "cm", data };
}

describe("riduciMiglioreProData", () => {
  it("restituisce array vuoto per input vuoto (AC #4)", () => {
    expect(riduciMiglioreProData([])).toEqual([]);
  });

  it("è un no-op quando c'è un solo punto per data (Peso/Altezza/Reach/Altro, nessuna regressione)", () => {
    const punti = [m("1", 30, "2026-01-01"), m("2", 32, "2026-02-01")];
    expect(riduciMiglioreProData(punti)).toEqual(punti);
  });

  it("tiene solo il valore più alto tra più tentativi con la stessa data (AC #4)", () => {
    const punti = [m("1", 30, "2026-01-01"), m("2", 35, "2026-01-01"), m("3", 28, "2026-01-01")];
    expect(riduciMiglioreProData(punti)).toEqual([punti[1]]);
  });

  it("non fonde mai date diverse tra loro", () => {
    const punti = [
      m("1", 30, "2026-01-01"),
      m("2", 35, "2026-01-01"),
      m("3", 40, "2026-02-01"),
    ];
    expect(riduciMiglioreProData(punti)).toEqual([punti[1], punti[2]]);
  });

  it("preserva l'ordine cronologico mescolando date singole e multiple", () => {
    const punti = [
      m("1", 10, "2026-01-01"),
      m("2", 30, "2026-02-01"),
      m("3", 35, "2026-02-01"),
      m("4", 20, "2026-03-01"),
    ];
    expect(riduciMiglioreProData(punti).map((p) => p.id)).toEqual(["1", "3", "4"]);
  });

  it("a parità di valore massimo tiene il primo incontrato", () => {
    const punti = [m("1", 35, "2026-01-01"), m("2", 35, "2026-01-01")];
    expect(riduciMiglioreProData(punti)).toEqual([punti[0]]);
  });
});

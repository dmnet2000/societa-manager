import { describe, expect, it } from "vitest";
import {
  calcolaStatistichePresenza,
  ETICHETTA_TREND,
} from "./calcola-statistiche-presenza";

function righe(...presenze: boolean[]) {
  return presenze.map((presente) => ({ presente }));
}

describe("calcolaStatistichePresenza", () => {
  it("restituisce null per uno storico vuoto (AC #3)", () => {
    expect(calcolaStatistichePresenza([])).toBeNull();
  });

  it("con una sola Presenza presente=true: percentuale 100, trend costante (AC #4)", () => {
    expect(calcolaStatistichePresenza(righe(true))).toEqual({
      percentuale: 100,
      trend: "costante",
    });
  });

  it("con una sola Presenza presente=false: percentuale 0, trend costante (AC #4)", () => {
    expect(calcolaStatistichePresenza(righe(false))).toEqual({
      percentuale: 0,
      trend: "costante",
    });
  });

  it("diff esattamente alla soglia (10 punti, prima 40% -> seconda 50%): costante, non in-crescita (AC #5, confine stretto)", () => {
    const storico = righe(
      true, true, true, true, false, false, false, false, false, false, // prima meta: 4/10 = 40%
      true, true, true, true, true, false, false, false, false, false // seconda meta: 5/10 = 50%
    );
    expect(calcolaStatistichePresenza(storico)).toEqual({
      percentuale: 45,
      trend: "costante",
    });
  });

  it("diff esattamente alla soglia negativa (-10 punti, prima 50% -> seconda 40%): costante, non in-calo (AC #5, confine stretto)", () => {
    const storico = righe(
      true, true, true, true, true, false, false, false, false, false, // prima meta: 5/10 = 50%
      true, true, true, true, false, false, false, false, false, false // seconda meta: 4/10 = 40%
    );
    expect(calcolaStatistichePresenza(storico)).toEqual({
      percentuale: 45,
      trend: "costante",
    });
  });

  it("diff sopra soglia (20 punti, prima 40% -> seconda 60%): in-crescita (AC #2, #5)", () => {
    const storico = righe(
      true, true, true, true, false, false, false, false, false, false, // prima meta: 40%
      true, true, true, true, true, true, false, false, false, false // seconda meta: 60%
    );
    expect(calcolaStatistichePresenza(storico)).toEqual({
      percentuale: 50,
      trend: "in-crescita",
    });
  });

  it("diff sotto soglia (-20 punti, prima 60% -> seconda 40%): in-calo (AC #2, #5)", () => {
    const storico = righe(
      true, true, true, true, true, true, false, false, false, false, // prima meta: 60%
      true, true, true, true, false, false, false, false, false, false // seconda meta: 40%
    );
    expect(calcolaStatistichePresenza(storico)).toEqual({
      percentuale: 50,
      trend: "in-calo",
    });
  });

  it("arrotonda la percentuale complessiva (1/3 -> 33%, AC #1)", () => {
    const risultato = calcolaStatistichePresenza(righe(true, false, false));
    expect(risultato?.percentuale).toBe(33);
  });

  it("confronta i tassi esatti delle due meta', non le percentuali gia' arrotondate (review fix): prima 8/11=72.73% -> seconda 10/12=83.33%, diff reale 10.61 > soglia -> in-crescita, anche se le percentuali arrotondate (73, 83) darebbero una diff di soli 10 punti", () => {
    const primaMeta = Array(11).fill(false).map((_, i) => i < 8);
    const secondaMeta = Array(12).fill(false).map((_, i) => i < 10);
    const risultato = calcolaStatistichePresenza([...primaMeta, ...secondaMeta].map((presente) => ({ presente })));
    expect(risultato).toEqual({ percentuale: 78, trend: "in-crescita" });
  });
});

describe("ETICHETTA_TREND", () => {
  it("mappa ogni valore di Trend a un'etichetta leggibile", () => {
    expect(ETICHETTA_TREND["in-calo"]).toBe("in calo");
    expect(ETICHETTA_TREND.costante).toBe("costante");
    expect(ETICHETTA_TREND["in-crescita"]).toBe("in crescita");
  });
});

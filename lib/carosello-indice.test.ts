import { describe, expect, it } from "vitest";
import { avanti, indietro, indiceEntroLimiti } from "./carosello-indice";

describe("avanti", () => {
  it("avanza normalmente all'indice successivo", () => {
    expect(avanti(0, 3)).toBe(1);
    expect(avanti(1, 3)).toBe(2);
  });

  it("avvolge dall'ultimo indice al primo (AC #2)", () => {
    expect(avanti(2, 3)).toBe(0);
  });

  it("resta sempre a 0 con un solo elemento (nessuna divisione per zero/NaN)", () => {
    expect(avanti(0, 1)).toBe(0);
  });

  it("resta a 0 con zero elementi", () => {
    expect(avanti(0, 0)).toBe(0);
  });
});

describe("indietro", () => {
  it("retrocede normalmente all'indice precedente", () => {
    expect(indietro(2, 3)).toBe(1);
    expect(indietro(1, 3)).toBe(0);
  });

  it("avvolge dal primo indice all'ultimo (AC #2) - non -1 come farebbe l'operatore % nativo di JS", () => {
    expect(indietro(0, 3)).toBe(2);
  });

  it("resta sempre a 0 con un solo elemento (nessuna divisione per zero/NaN)", () => {
    expect(indietro(0, 1)).toBe(0);
  });

  it("resta a 0 con zero elementi", () => {
    expect(indietro(0, 0)).toBe(0);
  });
});

// Review fix (Blind Hunter + Edge Case Hunter, trovato indipendentemente da
// entrambi): senza questo clamp, un indice da uno stato precedente poteva
// puntare oltre la nuova lunghezza dell'elenco Banner se questo si riduceva
// tra un render e l'altro.
describe("indiceEntroLimiti", () => {
  it("restituisce l'indice invariato se già entro i limiti", () => {
    expect(indiceEntroLimiti(1, 3)).toBe(1);
  });

  it("clampa all'ultimo indice valido se l'elenco si è ridotto", () => {
    expect(indiceEntroLimiti(4, 2)).toBe(1);
  });

  it("restituisce 0 con zero elementi (nessun indice negativo/NaN)", () => {
    expect(indiceEntroLimiti(3, 0)).toBe(0);
  });

  it("restituisce 0 con un solo elemento", () => {
    expect(indiceEntroLimiti(5, 1)).toBe(0);
  });
});

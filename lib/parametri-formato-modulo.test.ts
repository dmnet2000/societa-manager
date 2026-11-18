import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { validaModuloParametri, liberiCoerenti } = await import("./parametri-formato-modulo");

describe("validaModuloParametri", () => {
  it("campi vuoti: nessuna chiave", () => {
    expect(validaModuloParametri({ cambiPerSet: "", rosaMax: "  " })).toEqual({ valori: {} });
  });

  it("imposta solo le chiavi compilate, mai versione", () => {
    expect(validaModuloParametri({ cambiPerSet: "6", puntiSet: "" })).toEqual({
      valori: { cambiPerSet: 6 },
    });
  });

  it("setPerVincere 3 rifiutato", () => {
    expect(validaModuloParametri({ setPerVincere: "3" })).toEqual({
      errori: { setPerVincere: "Set per vincere: per ora solo 2" },
    });
    expect(validaModuloParametri({ setPerVincere: "2" })).toEqual({ valori: { setPerVincere: 2 } });
  });

  it.each([["30"], ["abc"], ["8.5"], ["0"], ["-1"], ["5"]])("rosaMax %s fuori range", (v) => {
    const r = validaModuloParametri({ rosaMax: v });
    expect("errori" in r && r.errori.rosaMax).toBeTruthy();
  });

  it("rispetta gli intervalli", () => {
    expect(validaModuloParametri({ rosaMax: "20", scartoMinimo: "10", puntiSet: "99" })).toEqual({
      valori: { rosaMax: 20, scartoMinimo: 10, puntiSet: 99 },
    });
    expect("errori" in validaModuloParametri({ scartoMinimo: "11" })).toBe(true);
    expect("errori" in validaModuloParametri({ liberiMax: "3" })).toBe(true);
    expect("errori" in validaModuloParametri({ cambiPerSet: "21" })).toBe(true);
  });
});

describe("liberiCoerenti", () => {
  it("default coerenti", () => expect(liberiCoerenti(null, null)).toBe(true));
  it("Edizione liberiMax 1, Categoria liberiMin 2: incoerente", () => {
    expect(liberiCoerenti({ liberiMax: 1 }, { liberiMin: 2 })).toBe(false);
  });
  it("Categoria liberiMax 2 sistema l'Edizione", () => {
    expect(liberiCoerenti({ liberiMin: 2, liberiMax: 2 }, { liberiMax: 2 })).toBe(true);
  });
  it("Edizione liberiMax 1 con default liberiMin 1: coerente", () => {
    expect(liberiCoerenti({ liberiMax: 1 }, null)).toBe(true);
  });
});

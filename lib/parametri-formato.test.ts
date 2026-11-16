import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { partitaTorneo: { findUnique: findUniqueMock } } }));

const { PARAMETRI_FORMATO_DEFAULT, parametriEffettivi, leggiParametriGara } = await import(
  "./parametri-formato"
);

describe("parametriEffettivi", () => {
  it("solo default: i valori di regole-gara", () => {
    expect(parametriEffettivi(null, null)).toEqual({
      versione: 1,
      setPerVincere: 2,
      puntiSet: 25,
      puntiSetDecisivo: 15,
      scartoMinimo: 2,
      cambiPerSet: 8,
      timeoutPerSet: 2,
      liberiMin: 1,
      liberiMax: 2,
      rosaMax: 14,
    });
    expect(parametriEffettivi(undefined, undefined)).toEqual(PARAMETRI_FORMATO_DEFAULT);
  });

  it("edizione: sovrascrive solo la sua chiave", () => {
    expect(parametriEffettivi({ cambiPerSet: 6 }, null)).toEqual({
      ...PARAMETRI_FORMATO_DEFAULT,
      cambiPerSet: 6,
    });
  });

  it("categoria: vince sull'edizione", () => {
    expect(parametriEffettivi({ cambiPerSet: 6, rosaMax: 12 }, { cambiPerSet: 8 })).toEqual({
      ...PARAMETRI_FORMATO_DEFAULT,
      cambiPerSet: 8,
      rosaMax: 12,
    });
  });

  it("ignora chiavi sconosciute e valori non interi positivi", () => {
    const sporco = { puntiSet: 21.5, rosaMax: "12", timeoutPerSet: 0, liberiMax: null, altro: 3, cambiPerSet: 5 };
    expect(parametriEffettivi(sporco, ["x"])).toEqual({ ...PARAMETRI_FORMATO_DEFAULT, cambiPerSet: 5 });
    expect(parametriEffettivi("x", 7)).toEqual(PARAMETRI_FORMATO_DEFAULT);
  });

  it("versione non si sovrascrive dal database", () => {
    expect(parametriEffettivi({ versione: 9 }, { versione: 7 }).versione).toBe(1);
  });

  it("setPerVincere diverso da 2 e' ignorato (AD-5)", () => {
    expect(parametriEffettivi({ setPerVincere: 3 }, { setPerVincere: 5 }).setPerVincere).toBe(2);
    expect(parametriEffettivi({ setPerVincere: 2 }, null).setPerVincere).toBe(2);
  });

  it("liberiMin > liberiMax dopo la fusione: tornano i default della coppia", () => {
    const r = parametriEffettivi({ liberiMin: 3, liberiMax: 4 }, { liberiMax: 2, rosaMax: 12 });
    expect(r).toEqual({ ...PARAMETRI_FORMATO_DEFAULT, rosaMax: 12 });
  });
});

describe("leggiParametriGara", () => {
  beforeEach(() => findUniqueMock.mockReset());

  it("fonde edizione e categoria della partita", async () => {
    findUniqueMock.mockResolvedValue({
      categoriaTorneo: {
        parametriFormato: { cambiPerSet: 8 },
        edizioneTorneo: { parametriFormato: { cambiPerSet: 6 } },
      },
    });
    const parametri = await leggiParametriGara("p-1");
    expect(parametri).toEqual({ ...PARAMETRI_FORMATO_DEFAULT, cambiPerSet: 8 });
    expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p-1" } }));
  });

  it("default se nessuno dei due ha parametri", async () => {
    findUniqueMock.mockResolvedValue({
      categoriaTorneo: { parametriFormato: null, edizioneTorneo: { parametriFormato: null } },
    });
    expect(await leggiParametriGara("p-1")).toEqual(PARAMETRI_FORMATO_DEFAULT);
  });

  it("null se la gara non esiste", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect(await leggiParametriGara("x")).toBeNull();
  });
});

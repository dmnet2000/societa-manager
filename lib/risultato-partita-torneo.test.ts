import { describe, expect, it } from "vitest";
import {
  risultatoValido,
  esitoPartita,
  terzoSetNecessario,
  haRisultatoCompleto,
  formattaRisultatoPartitaTorneo,
} from "./risultato-partita-torneo";

describe("risultatoValido", () => {
  it("accetta un 2-0 (due set vinti dalla stessa squadra, nessun terzo set)", () => {
    expect(risultatoValido({ casa: 25, ospite: 20 }, { casa: 25, ospite: 18 })).toBe(true);
  });

  it("accetta un 0-2 (l'ospite vince i primi due set)", () => {
    expect(risultatoValido({ casa: 20, ospite: 25 }, { casa: 18, ospite: 25 })).toBe(true);
  });

  it("accetta un 2-1 (casa vince il terzo set dopo l'1-1)", () => {
    expect(
      risultatoValido(
        { casa: 25, ospite: 20 },
        { casa: 20, ospite: 25 },
        { casa: 15, ospite: 10 }
      )
    ).toBe(true);
  });

  it("accetta un 1-2 (ospite vince il terzo set dopo l'1-1)", () => {
    expect(
      risultatoValido(
        { casa: 25, ospite: 20 },
        { casa: 20, ospite: 25 },
        { casa: 10, ospite: 15 }
      )
    ).toBe(true);
  });

  it("rifiuta un set1 pari", () => {
    expect(risultatoValido({ casa: 20, ospite: 20 }, { casa: 25, ospite: 18 })).toBe(false);
  });

  it("rifiuta un set2 pari", () => {
    expect(risultatoValido({ casa: 25, ospite: 18 }, { casa: 20, ospite: 20 })).toBe(false);
  });

  it("rifiuta un terzo set pari", () => {
    expect(
      risultatoValido(
        { casa: 25, ospite: 20 },
        { casa: 20, ospite: 25 },
        { casa: 15, ospite: 15 }
      )
    ).toBe(false);
  });

  it("rifiuta un terzo set mancante quando le prime due squadre sono 1-1", () => {
    expect(risultatoValido({ casa: 25, ospite: 20 }, { casa: 20, ospite: 25 })).toBe(false);
  });

  it("rifiuta un terzo set presente quando i primi due sono gia' un 2-0 per casa", () => {
    expect(
      risultatoValido(
        { casa: 25, ospite: 20 },
        { casa: 25, ospite: 18 },
        { casa: 15, ospite: 10 }
      )
    ).toBe(false);
  });

  it("rifiuta un terzo set presente quando i primi due sono gia' uno 0-2 per ospite", () => {
    expect(
      risultatoValido(
        { casa: 20, ospite: 25 },
        { casa: 18, ospite: 25 },
        { casa: 15, ospite: 10 }
      )
    ).toBe(false);
  });
});

describe("esitoPartita", () => {
  it("calcola 2-0 e punti 3/0", () => {
    expect(esitoPartita({ casa: 25, ospite: 20 }, { casa: 25, ospite: 18 })).toEqual({
      setVintiCasa: 2,
      setVintiOspite: 0,
      puntiCasa: 3,
      puntiOspite: 0,
    });
  });

  it("calcola 0-2 e punti 0/3", () => {
    expect(esitoPartita({ casa: 20, ospite: 25 }, { casa: 18, ospite: 25 })).toEqual({
      setVintiCasa: 0,
      setVintiOspite: 2,
      puntiCasa: 0,
      puntiOspite: 3,
    });
  });

  it("calcola 2-1 e punti 2/1", () => {
    expect(
      esitoPartita(
        { casa: 25, ospite: 20 },
        { casa: 20, ospite: 25 },
        { casa: 15, ospite: 10 }
      )
    ).toEqual({
      setVintiCasa: 2,
      setVintiOspite: 1,
      puntiCasa: 2,
      puntiOspite: 1,
    });
  });

  it("calcola 1-2 e punti 1/2", () => {
    expect(
      esitoPartita(
        { casa: 25, ospite: 20 },
        { casa: 20, ospite: 25 },
        { casa: 10, ospite: 15 }
      )
    ).toEqual({
      setVintiCasa: 1,
      setVintiOspite: 2,
      puntiCasa: 1,
      puntiOspite: 2,
    });
  });
});

describe("terzoSetNecessario", () => {
  it("returns false quando la stessa squadra vince i primi due set (2-0)", () => {
    expect(terzoSetNecessario({ casa: 25, ospite: 20 }, { casa: 25, ospite: 18 })).toBe(false);
  });

  it("returns false quando l'ospite vince i primi due set (0-2)", () => {
    expect(terzoSetNecessario({ casa: 20, ospite: 25 }, { casa: 18, ospite: 25 })).toBe(false);
  });

  it("returns true quando le prime due squadre si sono spartite i set (1-1)", () => {
    expect(terzoSetNecessario({ casa: 25, ospite: 20 }, { casa: 20, ospite: 25 })).toBe(true);
  });

  it("returns false su un set1 pari (nessun vincitore)", () => {
    expect(terzoSetNecessario({ casa: 20, ospite: 20 }, { casa: 25, ospite: 18 })).toBe(false);
  });

  it("returns false su un set2 pari (nessun vincitore)", () => {
    expect(terzoSetNecessario({ casa: 25, ospite: 18 }, { casa: 20, ospite: 20 })).toBe(false);
  });
});

describe("haRisultatoCompleto", () => {
  it("returns true quando set1 e set2 sono entrambi valorizzati (set3 irrilevante)", () => {
    expect(
      haRisultatoCompleto({ set1Casa: 25, set1Ospite: 20, set2Casa: 25, set2Ospite: 18 })
    ).toBe(true);
  });

  it("returns false se manca set1", () => {
    expect(
      haRisultatoCompleto({ set1Casa: null, set1Ospite: null, set2Casa: 25, set2Ospite: 18 })
    ).toBe(false);
  });

  it("returns false se manca set2", () => {
    expect(
      haRisultatoCompleto({ set1Casa: 25, set1Ospite: 20, set2Casa: null, set2Ospite: null })
    ).toBe(false);
  });
});

describe("formattaRisultatoPartitaTorneo", () => {
  // Story 20.6: estratta da RisultatoPartitaTorneoForm.tsx (funzione locale
  // "formattaRisultato", non esportata) - stessa logica esatta, ora riusata
  // anche dalla pagina pubblica del Torneo.
  it("returns null quando il risultato non e' ancora completo", () => {
    expect(
      formattaRisultatoPartitaTorneo({
        set1Casa: null,
        set1Ospite: null,
        set2Casa: null,
        set2Ospite: null,
        set3Casa: null,
        set3Ospite: null,
      })
    ).toBeNull();
  });

  it("formatta un 2-0 senza terzo set", () => {
    expect(
      formattaRisultatoPartitaTorneo({
        set1Casa: 25,
        set1Ospite: 20,
        set2Casa: 25,
        set2Ospite: 18,
        set3Casa: null,
        set3Ospite: null,
      })
    ).toBe("2-0 (25-20, 25-18) — 3-0 punti");
  });

  it("formatta un 2-1 con terzo set", () => {
    expect(
      formattaRisultatoPartitaTorneo({
        set1Casa: 25,
        set1Ospite: 20,
        set2Casa: 20,
        set2Ospite: 25,
        set3Casa: 15,
        set3Ospite: 10,
      })
    ).toBe("2-1 (25-20, 20-25, 15-10) — 2-1 punti");
  });
});

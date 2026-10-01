import { describe, expect, it } from "vitest";
import {
  COLORE_DEFAULT_RIGA,
  normalizzaColoreCampionato,
  propsRigaDaPartita,
  propsRigaDaRisultato,
  testoOppureNull,
  type PartitaPerRiga,
} from "./props-riga-partita";
import type { RisultatoSettimanaScorsa } from "./sincronizza-gare-fipav/vista-home-live";

describe("normalizzaColoreCampionato", () => {
  it("accetta #rrggbb e lo porta in minuscolo", () => {
    expect(normalizzaColoreCampionato("#AA00ff")).toBe("#aa00ff");
  });

  it("toglie gli spazi prima di validare", () => {
    expect(normalizzaColoreCampionato("  #ffff66 ")).toBe("#ffff66");
  });

  it("espande #rgb", () => {
    expect(normalizzaColoreCampionato("#fA0")).toBe("#ffaa00");
  });

  it("null, vuoto o formato inatteso -> default", () => {
    expect(normalizzaColoreCampionato(null)).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato(undefined)).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato("   ")).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato("red")).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato("#12345")).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato("#ggg")).toBe(COLORE_DEFAULT_RIGA);
    expect(normalizzaColoreCampionato("rgb(0,0,0)")).toBe(COLORE_DEFAULT_RIGA);
  });

  it("il default e' il blu storico della match-card", () => {
    expect(COLORE_DEFAULT_RIGA).toBe("#2e6f99");
  });
});

describe("testoOppureNull", () => {
  it("vuoto o soli spazi -> null, altrimenti trim", () => {
    expect(testoOppureNull(null)).toBeNull();
    expect(testoOppureNull(undefined)).toBeNull();
    expect(testoOppureNull("")).toBeNull();
    expect(testoOppureNull("   ")).toBeNull();
    expect(testoOppureNull(" 3-1 ")).toBe("3-1");
  });
});

const PARTITA: PartitaPerRiga = {
  data: "2026-09-30",
  ora: "20:30",
  squadraCasa: "Volley Mogliano",
  squadraOspite: "Volley Zero Branco",
  impianto: "Palestra Olme",
  indirizzoImpianto: "Via Olme 1, Mogliano Veneto",
  campionato: { nome: "U17 Femminile", colore: "#aa0000" },
};

describe("propsRigaDaPartita", () => {
  it("mappa ogni campo al posto giusto (nessuno scambio)", () => {
    expect(propsRigaDaPartita(PARTITA)).toEqual({
      data: "2026-09-30",
      campionatoNome: "U17 Femminile",
      colore: "#aa0000",
      squadraCasa: "Volley Mogliano",
      squadraOspite: "Volley Zero Branco",
      impianto: "Palestra Olme",
      indirizzoImpianto: "Via Olme 1, Mogliano Veneto",
      destra: { tipo: "ora", valore: "20:30" },
    });
  });

  it("colore e palestra assenti restano null", () => {
    const props = propsRigaDaPartita({
      ...PARTITA,
      impianto: null,
      indirizzoImpianto: null,
      campionato: { nome: "Serie D", colore: null },
    });
    expect(props.colore).toBeNull();
    expect(props.impianto).toBeNull();
    expect(props.indirizzoImpianto).toBeNull();
  });
});

const RISULTATO: RisultatoSettimanaScorsa = {
  chiave: "k1",
  data: "2026-09-23",
  ora: "18:00",
  squadraCasa: "Asolo U17 LZ",
  squadraOspite: "Volley Mogliano",
  risultato: "1-3",
  statoDescrizione: "gara omologata",
  campionatoNome: "U17 Femminile",
  campionatoColore: "#ffff66",
};

describe("propsRigaDaRisultato", () => {
  it("risultato e stato non scambiati, ora passata come secondaria", () => {
    expect(propsRigaDaRisultato(RISULTATO)).toEqual({
      data: "2026-09-23",
      campionatoNome: "U17 Femminile",
      colore: "#ffff66",
      squadraCasa: "Asolo U17 LZ",
      squadraOspite: "Volley Mogliano",
      destra: {
        tipo: "risultato",
        risultato: "1-3",
        stato: "gara omologata",
        ora: "18:00",
      },
    });
  });

  it("nessuna palestra/indirizzo (il dato live FIPAV non li porta)", () => {
    const props = propsRigaDaRisultato(RISULTATO);
    expect(props.impianto).toBeUndefined();
    expect(props.indirizzoImpianto).toBeUndefined();
  });
});

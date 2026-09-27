import { describe, expect, it } from "vitest";
import {
  classifichePerCampionatoDaLetture,
  risultatiSettimanaScorsaDaLetture,
  type LetturaPerCampionato,
} from "./vista-home-live";
import type { LetturaLiveFipav } from "./leggi-live-fipav";

const CAMPIONATO_A = {
  id: "campionato-a",
  nome: "Serie C Girone A",
  colore: "#2E6F99",
  gruppo: { nome: "Prima Squadra" },
};

const CAMPIONATO_B = {
  id: "campionato-b",
  nome: "Under 16",
  colore: null,
  gruppo: { nome: "Under 16" },
};

function garaFittizia(overrides: Partial<LetturaLiveFipav["risultati"][number]> = {}) {
  return {
    garaNumero: "1",
    giornata: "1",
    data: "2026-09-20",
    ora: "18:00",
    squadraCasa: "Casa",
    squadraOspite: "Ospite",
    risultato: "3 - 0",
    parziali: "25-19,25-18,25-20",
    statoDescrizione: "gara omologata",
    impianto: null,
    indirizzoImpianto: null,
    ...overrides,
  };
}

const LUNEDI_PRECEDENTE = "2026-09-14";
const DOMENICA_PRECEDENTE = "2026-09-20";

describe("risultatiSettimanaScorsaDaLetture", () => {
  it("include una gara la cui data cade nella settimana precedente (matrice I/O riga 1)", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: { risultati: [garaFittizia({ data: "2026-09-16" })], classifica: [] },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe).toHaveLength(1);
    expect(righe[0].campionatoNome).toBe("Serie C Girone A");
  });

  // Review fix (Blind Hunter): statoDescrizione propagato nella vista, cosi'
  // la UI puo' distinguere "non ancora giocata" da "rinviata/sospesa"
  // invece di mostrare sempre lo stesso testo generico.
  it("propaga statoDescrizione dalla riga grezza alla vista", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: {
          risultati: [
            garaFittizia({ data: "2026-09-16", statoDescrizione: "gara rinviata" }),
          ],
          classifica: [],
        },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe[0].statoDescrizione).toBe("gara rinviata");
  });

  // Review fix (Edge Case Hunter): due gare con lo stesso garaNumero per lo
  // stesso Campionato (rinviata/recuperata, o un dato del portale
  // anomalo) devono comunque produrre chiavi React univoche.
  it("genera chiavi uniche anche per due righe con lo stesso garaNumero nello stesso Campionato", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: {
          risultati: [
            garaFittizia({ garaNumero: "7", data: "2026-09-16", ora: "18:00" }),
            garaFittizia({ garaNumero: "7", data: "2026-09-17", ora: "18:00" }),
          ],
          classifica: [],
        },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe).toHaveLength(2);
    expect(new Set(righe.map((r) => r.chiave)).size).toBe(2);
  });

  it("esclude una gara fuori dalla settimana precedente, nessun blocco per quel Campionato (matrice I/O riga 2)", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: { risultati: [garaFittizia({ data: "2026-09-01" })], classifica: [] },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe).toEqual([]);
  });

  it("include i confini della settimana (lunedi' e domenica compresi)", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: {
          risultati: [
            garaFittizia({ garaNumero: "1", data: LUNEDI_PRECEDENTE }),
            garaFittizia({ garaNumero: "2", data: DOMENICA_PRECEDENTE }),
          ],
          classifica: [],
        },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe).toHaveLength(2);
  });

  it("omette silenziosamente un Campionato con lettura fallita (null), senza toccare gli altri (matrice I/O riga 5/6)", () => {
    const letture: LetturaPerCampionato[] = [
      { campionato: CAMPIONATO_A, lettura: null },
      {
        campionato: CAMPIONATO_B,
        lettura: { risultati: [garaFittizia({ data: "2026-09-17" })], classifica: [] },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe).toHaveLength(1);
    expect(righe[0].campionatoNome).toBe("Under 16");
  });

  it("nessun Campionato con linkFipav -> nessuna riga (matrice I/O riga 7)", () => {
    const righe = risultatiSettimanaScorsaDaLetture([], LUNEDI_PRECEDENTE, DOMENICA_PRECEDENTE);

    expect(righe).toEqual([]);
  });

  it("ordina per data poi per ora, indipendentemente dal Campionato di provenienza", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: {
          risultati: [garaFittizia({ garaNumero: "1", data: "2026-09-19", ora: "21:00" })],
          classifica: [],
        },
      },
      {
        campionato: CAMPIONATO_B,
        lettura: {
          risultati: [garaFittizia({ garaNumero: "2", data: "2026-09-16", ora: "18:00" })],
          classifica: [],
        },
      },
    ];

    const righe = risultatiSettimanaScorsaDaLetture(
      letture,
      LUNEDI_PRECEDENTE,
      DOMENICA_PRECEDENTE
    );

    expect(righe.map((r) => r.campionatoNome)).toEqual(["Under 16", "Serie C Girone A"]);
  });
});

describe("classifichePerCampionatoDaLetture", () => {
  it("include un Campionato con lettura riuscita e classifica non vuota (matrice I/O riga 3)", () => {
    const letture: LetturaPerCampionato[] = [
      {
        campionato: CAMPIONATO_A,
        lettura: {
          risultati: [],
          classifica: [{ posizione: "1", squadra: "Casa", punti: "10", partiteGiocate: null, partiteVinte: null, partitePerse: null, setFatti: null, setSubiti: null, quozienteSet: null, puntiFatti: null, puntiSubiti: null, quozientePunti: null, penalizzazione: null }],
        },
      },
    ];

    const classifiche = classifichePerCampionatoDaLetture(letture);

    expect(classifiche).toHaveLength(1);
    expect(classifiche[0].gruppoNome).toBe("Prima Squadra");
    expect(classifiche[0].righe).toHaveLength(1);
  });

  it("omette un Campionato senza linkFipav/con lettura fallita (matrice I/O riga 4/5/6)", () => {
    const letture: LetturaPerCampionato[] = [{ campionato: CAMPIONATO_A, lettura: null }];

    expect(classifichePerCampionatoDaLetture(letture)).toEqual([]);
  });

  it("omette un Campionato con lettura riuscita ma classifica vuota (nessuna card vuota)", () => {
    const letture: LetturaPerCampionato[] = [
      { campionato: CAMPIONATO_A, lettura: { risultati: [], classifica: [] } },
    ];

    expect(classifichePerCampionatoDaLetture(letture)).toEqual([]);
  });
});

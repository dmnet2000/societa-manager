import { describe, expect, it } from "vitest";
import {
  bordiNavigazione,
  campionatiDistinti,
  filtraVisibili,
  etichettaGiorno,
  etichettaMese,
  intervalloMesi,
  leggiNascosti,
  meseAdiacente,
  meseIniziale,
  partitePerGiorno,
  settimaneDelMese,
  unisciNascostiDaSalvare,
  formattaParziali,
  righeDettaglioPartita,
  partitaPerVistaMese,
} from "./griglia-mensile";

describe("settimaneDelMese", () => {
  it("righe complete lunedi-domenica, giorni fuori mese marcati", () => {
    // ottobre 2026: 1 = giovedi, 31 = sabato
    const settimane = settimaneDelMese("2026-10");
    expect(settimane).toHaveLength(5);
    for (const riga of settimane) expect(riga).toHaveLength(7);
    expect(settimane[0][0]).toEqual({ data: "2026-09-28", delMese: false });
    expect(settimane[0][3]).toEqual({ data: "2026-10-01", delMese: true });
    expect(settimane[4][5]).toEqual({ data: "2026-10-31", delMese: true });
    expect(settimane[4][6]).toEqual({ data: "2026-11-01", delMese: false });
  });

  it("febbraio bisestile", () => {
    const settimane = settimaneDelMese("2028-02");
    const delMese = settimane.flat().filter((g) => g.delMese);
    expect(delMese).toHaveLength(29);
    expect(delMese.at(-1)?.data).toBe("2028-02-29");
  });

  it("mese che inizia di domenica: prima riga quasi tutta fuori mese", () => {
    // marzo 2026: 1 = domenica, 31 = martedi
    const settimane = settimaneDelMese("2026-03");
    expect(settimane[0][6]).toEqual({ data: "2026-03-01", delMese: true });
    expect(settimane[0].slice(0, 6).every((g) => !g.delMese)).toBe(true);
    expect(settimane).toHaveLength(6);
  });

  it("mese che inizia di lunedi e finisce di domenica: nessun giorno fuori mese", () => {
    // febbraio 2027: 1 = lunedi, 28 = domenica
    const settimane = settimaneDelMese("2027-02");
    expect(settimane).toHaveLength(4);
    expect(settimane.flat().every((g) => g.delMese)).toBe(true);
  });

  it("formato mese non valido lancia", () => {
    expect(() => settimaneDelMese("2026-13")).toThrow();
  });
});

describe("intervalloMesi", () => {
  it("primo e ultimo mese con date valide, date invalide ignorate", () => {
    expect(intervalloMesi(["2026-11-03", "abc", "2026-09-20", "2027-04-01"])).toEqual({
      min: "2026-09",
      max: "2027-04",
    });
  });

  it("nessuna data valida -> null (stagione vuota)", () => {
    expect(intervalloMesi([])).toBeNull();
    expect(intervalloMesi(["non-una-data"])).toBeNull();
  });
});

describe("meseIniziale", () => {
  it("mese corrente dentro la stagione", () => {
    expect(meseIniziale("2026-12", "2026-09", "2027-04")).toBe("2026-12");
  });
  it("prima della stagione -> primo mese", () => {
    expect(meseIniziale("2026-07", "2026-09", "2027-04")).toBe("2026-09");
  });
  it("dopo la stagione -> ultimo mese", () => {
    expect(meseIniziale("2027-06", "2026-09", "2027-04")).toBe("2027-04");
  });
});

describe("bordiNavigazione", () => {
  const intervallo = { min: "2026-09", max: "2027-04" };
  it("primo mese: solo la freccia indietro disattivata", () => {
    expect(bordiNavigazione("2026-09", intervallo)).toEqual({ primo: true, ultimo: false });
  });
  it("ultimo mese: solo la freccia avanti disattivata", () => {
    expect(bordiNavigazione("2027-04", intervallo)).toEqual({ primo: false, ultimo: true });
  });
  it("mese interno: entrambe attive", () => {
    expect(bordiNavigazione("2026-12", intervallo)).toEqual({ primo: false, ultimo: false });
  });
  it("stagione di un solo mese o senza date: entrambe disattivate", () => {
    expect(bordiNavigazione("2026-10", { min: "2026-10", max: "2026-10" })).toEqual({
      primo: true,
      ultimo: true,
    });
    expect(bordiNavigazione("2026-10", null)).toEqual({ primo: true, ultimo: true });
  });
});

describe("filtraVisibili", () => {
  it("esclude le Partite dei Campionati nascosti", () => {
    const partite = [
      { id: 1, campionato: { id: "a" } },
      { id: 2, campionato: { id: "b" } },
      { id: 3, campionato: { id: "a" } },
    ];
    expect(filtraVisibili(partite, ["a"]).map((p) => p.id)).toEqual([2]);
    expect(filtraVisibili(partite, []).map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("meseAdiacente", () => {
  it("avanti e indietro con riporto d'anno", () => {
    expect(meseAdiacente("2026-12", 1)).toBe("2027-01");
    expect(meseAdiacente("2027-01", -1)).toBe("2026-12");
    expect(meseAdiacente("2026-10", 1)).toBe("2026-11");
  });
});

describe("etichette", () => {
  it("mese e giorno in italiano, calcolati in UTC", () => {
    expect(etichettaMese("2026-10")).toBe("ottobre 2026");
    expect(etichettaGiorno("2025-10-14")).toBe("martedì 14 ottobre");
  });
});

describe("campionatiDistinti", () => {
  it("un Campionato per id, ordinati per nome", () => {
    const risultato = campionatiDistinti([
      { campionato: { id: "b", nome: "Under 16", colore: null } },
      { campionato: { id: "a", nome: "Serie D", colore: "#ff0000" } },
      { campionato: { id: "b", nome: "Under 16", colore: null } },
      { campionato: { id: "c", nome: "Prima Divisione", colore: "#00ff00" } },
    ]);
    expect(risultato.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});

describe("leggiNascosti", () => {
  const validi = ["a", "b"];
  it("storage assente -> tutti selezionati", () => {
    expect(leggiNascosti(null, validi)).toEqual([]);
  });
  it("JSON corrotto o forma inattesa -> tutti selezionati", () => {
    expect(leggiNascosti("{rotto", validi)).toEqual([]);
    expect(leggiNascosti('{"a":1}', validi)).toEqual([]);
    expect(leggiNascosti('"a"', validi)).toEqual([]);
  });
  it("id sconosciuti, non stringa e duplicati scartati", () => {
    expect(leggiNascosti('["a","zzz",3,"a"]', validi)).toEqual(["a"]);
  });
  it("selezione valida conservata", () => {
    expect(leggiNascosti('["b","a"]', validi)).toEqual(["b", "a"]);
  });
});

describe("partitePerGiorno", () => {
  it("raggruppa per giorno, ordina per ora, esclude date invalide", () => {
    const mappa = partitePerGiorno([
      { id: 1, data: "2026-10-14", ora: "20:30" },
      { id: 2, data: "2026-10-14", ora: "9:00" },
      { id: 3, data: "data-rotta", ora: "18:00" },
      { id: 4, data: "2026-10-15", ora: "18:00" },
    ]);
    expect(mappa.get("2026-10-14")?.map((p) => p.id)).toEqual([2, 1]);
    expect(mappa.get("2026-10-15")?.map((p) => p.id)).toEqual([4]);
    expect([...mappa.keys()]).toHaveLength(2);
  });
});

describe("unisciNascostiDaSalvare", () => {
  const validi = ["a", "b"];
  it("conserva gli id salvati che non sono Campionati di questa stagione", () => {
    expect(unisciNascostiDaSalvare('["vecchio","a"]', ["b"], validi)).toEqual([
      "vecchio",
      "b",
    ]);
  });
  it("un Campionato di stagione riselezionato viene tolto dal salvato", () => {
    expect(unisciNascostiDaSalvare('["a","b"]', ["b"], validi)).toEqual(["b"]);
  });
  it("storage assente o corrotto -> solo i nascosti correnti, senza duplicati", () => {
    expect(unisciNascostiDaSalvare(null, ["a", "a"], validi)).toEqual(["a"]);
    expect(unisciNascostiDaSalvare("{rotto", ["b"], validi)).toEqual(["b"]);
  });
  it("id non stringa e duplicati nel salvato scartati", () => {
    expect(unisciNascostiDaSalvare('["x",3,"x"]', [], validi)).toEqual(["x"]);
  });
});

describe("formattaParziali", () => {
  it("separa i set con virgola e spazio", () => {
    expect(formattaParziali("25-20,22-25,25-18,25-19")).toBe("25-20, 22-25, 25-18, 25-19");
  });
  it("null, vuoto o solo separatori -> null", () => {
    expect(formattaParziali(null)).toBeNull();
    expect(formattaParziali(undefined)).toBeNull();
    expect(formattaParziali("")).toBeNull();
    expect(formattaParziali(" , ")).toBeNull();
  });
});

describe("righeDettaglioPartita", () => {
  const base = {
    data: "2026-10-14",
    ora: "20:30",
    giornata: null,
    impianto: null,
    indirizzoImpianto: null,
    statoDescrizione: null,
    risultato: null,
    parziali: null,
  };

  it("Partita futura completa: data, ora, palestra, indirizzo in ordine", () => {
    const righe = righeDettaglioPartita({
      ...base,
      giornata: "3",
      impianto: "Palazzetto Mogliano",
      indirizzoImpianto: "Via Roma 1, Mogliano Veneto",
      statoDescrizione: null,
      risultato: null,
      parziali: null,
    });
    expect(righe).toEqual([
      { chiave: "quando", etichetta: "Quando", valore: "mercoledì 14 ottobre 2026, ore 20:30" },
      { chiave: "giornata", etichetta: "Giornata", valore: "3" },
      { chiave: "palestra", etichetta: "Palestra", valore: "Palazzetto Mogliano" },
      { chiave: "indirizzo", etichetta: "Indirizzo", valore: "Via Roma 1, Mogliano Veneto" },
    ]);
  });

  it("Partita giocata: risultato e parziali", () => {
    const righe = righeDettaglioPartita({
      ...base,
      risultato: "3-1",
      parziali: "25-20,22-25,25-18,25-19",
    });
    expect(righe.map((r) => r.chiave)).toEqual(["quando", "risultato", "parziali"]);
    expect(righe[1].valore).toBe("3-1");
    expect(righe[2].valore).toBe("25-20, 22-25, 25-18, 25-19");
  });

  it("campi opzionali null o vuoti omessi", () => {
    const righe = righeDettaglioPartita({
      ...base,
      giornata: "",
      impianto: "  ",
      indirizzoImpianto: null,
      statoDescrizione: null,
      risultato: "",
      parziali: "",
    });
    expect(righe.map((r) => r.chiave)).toEqual(["quando"]);
  });

  it("stato senza risultato: mostra lo stato", () => {
    const righe = righeDettaglioPartita({ ...base, statoDescrizione: "Rinviata", risultato: null });
    expect(righe.map((r) => [r.chiave, r.valore])).toEqual([
      ["quando", "mercoledì 14 ottobre 2026, ore 20:30"],
      ["stato", "Rinviata"],
    ]);
  });

  it("data non parsabile: resta solo l'ora", () => {
    expect(righeDettaglioPartita({ ...base, data: "abc", ora: "18:00" })[0].valore).toBe("ore 18:00");
  });

  it("stato e risultato insieme: entrambi mostrati, stato prima del risultato", () => {
    const righe = righeDettaglioPartita({ ...base, statoDescrizione: "Giocata", risultato: "3-1" });
    expect(righe.map((r) => [r.chiave, r.valore])).toEqual([
      ["quando", "mercoledì 14 ottobre 2026, ore 20:30"],
      ["stato", "Giocata"],
      ["risultato", "3-1"],
    ]);
  });
});

describe("partitaPerVistaMese", () => {
  it("da una riga completa escono tutti i campi di griglia e popup, nient'altro", () => {
    const completa = {
      id: "p1",
      data: "2026-10-14",
      ora: "20:30",
      squadraCasa: "Mogliano",
      squadraOspite: "Treviso",
      impianto: "Palazzetto Mogliano",
      indirizzoImpianto: "Via Roma 1, Mogliano Veneto",
      giornata: "3",
      statoDescrizione: "Giocata",
      risultato: "3-1",
      parziali: "25-20,22-25,25-18,25-19",
      campionato: { id: "serie-d", nome: "Serie D", colore: "#ff0000" },
    };
    // Campi in piu' della riga Prisma non devono arrivare al client.
    const riga = {
      ...completa,
      gruppoId: "g1",
      campionato: { ...completa.campionato, linkFipav: "https://esempio" },
    };
    expect(partitaPerVistaMese(riga)).toEqual(completa);
  });
});

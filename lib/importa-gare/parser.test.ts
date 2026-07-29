import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

vi.mock("server-only", () => ({}));

const { analizzaFileGare } = await import("./parser");

const INTESTAZIONI = [
  "Campionato",
  "Gara N",
  "Giornata",
  "Data",
  "Ora",
  "SquadraCasa",
  "SquadraOspite",
  "Risultato",
  "Parziali",
  "StatoDescrizione",
  "Impianto",
  "IndirizzoImpianto",
];

function creaFileDiTest(righe: (string | number)[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([INTESTAZIONI, ...righe]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Foglio 1");
  const arrayBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(arrayBuffer);
}

function rigaCompleta(overrides: Record<string, string | number> = {}) {
  const base: Record<string, string | number> = {
    Campionato: "Serie D femminile - Girone C",
    "Gara N": 1568,
    Giornata: 1,
    Data: "25/10/2025",
    Ora: "20:30",
    SquadraCasa: "VOLLEY MOGLIANO",
    SquadraOspite: "SPACCIO OCCHIALI VISION",
    Risultato: "3-1",
    Parziali: "21-25 25-14 25-18 26-24",
    StatoDescrizione: "gara omologata",
    Impianto: "Palestra Olme - MOGLIANO VENETO (TV)",
    IndirizzoImpianto: "Via Olme",
  };
  return { ...base, ...overrides };
}

function rigaComeArray(riga: Record<string, string | number>): (string | number)[] {
  return INTESTAZIONI.map((intestazione) => riga[intestazione] ?? "");
}

describe("analizzaFileGare", () => {
  it("importa correttamente una riga completa (formato reale del file federale)", () => {
    const buffer = creaFileDiTest([rigaComeArray(rigaCompleta())]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toEqual([
      {
        garaNumero: "1568",
        giornata: "1",
        data: "2025-10-25",
        ora: "20:30",
        squadraCasa: "VOLLEY MOGLIANO",
        squadraOspite: "SPACCIO OCCHIALI VISION",
        risultato: "3-1",
        parziali: "21-25 25-14 25-18 26-24",
        statoDescrizione: "gara omologata",
        impianto: "Palestra Olme - MOGLIANO VENETO (TV)",
        indirizzoImpianto: "Via Olme",
      },
    ]);
  });

  it("importa una riga con i soli campi essenziali, campi opzionali assenti diventano null (non un motivo di scarto)", () => {
    const riga = {
      "Gara N": 2000,
      Data: "01/01/2026",
      Ora: "18:00",
      SquadraCasa: "CASA",
      SquadraOspite: "OSPITE",
    };
    const buffer = creaFileDiTest([rigaComeArray(riga)]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe[0]).toMatchObject({
      garaNumero: "2000",
      giornata: null,
      risultato: null,
      parziali: null,
      statoDescrizione: null,
      impianto: null,
      indirizzoImpianto: null,
    });
  });

  it("lancia un errore chiaro quando mancano colonne essenziali dall'intestazione", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Campionato", "Data", "Ora"], // manca Gara N, SquadraCasa, SquadraOspite
      ["Serie D", "25/10/2025", "20:30"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Foglio 1");
    const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));

    expect(() => analizzaFileGare(buffer)).toThrow(/Gara N/);
  });

  it("scarta una riga con Gara N mancante, il resto del file viene comunque importato", () => {
    const buffer = creaFileDiTest([
      rigaComeArray(rigaCompleta({ "Gara N": "" })),
      rigaComeArray(rigaCompleta({ "Gara N": 1575 })),
    ]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "Gara N mancante o vuoto" },
    ]);
    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].garaNumero).toBe("1575");
  });

  it("non rifiuta l'intero file se la PRIMA riga dati ha una cella essenziale realmente vuota (regressione review fix)", () => {
    // sheet_to_json omette dalle chiavi di una riga le celle vuote (non ""):
    // il controllo colonne mancanti va quindi fatto sull'intestazione vera
    // (riga 1), non su Object.keys della prima riga dati - altrimenti
    // questo file, con intestazione perfettamente valida, veniva rifiutato
    // per intero con "colonne mancanti (Gara N)".
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      INTESTAZIONI,
      [
        "Serie D",
        null,
        1,
        "25/10/2025",
        "20:30",
        "CASA",
        "OSPITE",
        "",
        "",
        "",
        "",
        "",
      ],
      rigaComeArray(rigaCompleta({ "Gara N": 1575 })),
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Foglio 1");
    const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "Gara N mancante o vuoto" },
    ]);
    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].garaNumero).toBe("1575");
  });

  it("non rifiuta il file per un'intestazione con spazi superflui (regressione review fix)", () => {
    const intestazioniConSpazi = INTESTAZIONI.map((nome) =>
      nome === "Gara N" ? " Gara N " : nome
    );
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      intestazioniConSpazi,
      rigaComeArray(rigaCompleta()),
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Foglio 1");
    const buffer = Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toHaveLength(1);
  });

  it("scarta una riga con Data non in formato gg/mm/aaaa", () => {
    const buffer = creaFileDiTest([rigaComeArray(rigaCompleta({ Data: "2025-10-25" }))]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "Data mancante o in formato non riconosciuto" },
    ]);
    expect(risultato.righe).toHaveLength(0);
  });

  it("scarta una riga con Ora mancante", () => {
    const buffer = creaFileDiTest([rigaComeArray(rigaCompleta({ Ora: "" }))]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([{ numeroRiga: 2, motivo: "Ora mancante o vuota" }]);
  });

  it("scarta una riga con SquadraCasa mancante", () => {
    const buffer = creaFileDiTest([rigaComeArray(rigaCompleta({ SquadraCasa: "" }))]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "SquadraCasa mancante o vuota" },
    ]);
  });

  it("scarta una riga con SquadraOspite mancante", () => {
    const buffer = creaFileDiTest([rigaComeArray(rigaCompleta({ SquadraOspite: "" }))]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.scartate).toEqual([
      { numeroRiga: 2, motivo: "SquadraOspite mancante o vuota" },
    ]);
  });

  it("importa correttamente più righe con Gara N/Giornata numerici, coercizzati a stringa", () => {
    const buffer = creaFileDiTest([
      rigaComeArray(rigaCompleta({ "Gara N": 1568, Giornata: 1 })),
      rigaComeArray(rigaCompleta({ "Gara N": 1575, Giornata: 2 })),
    ]);

    const risultato = analizzaFileGare(buffer);

    expect(risultato.righe).toHaveLength(2);
    expect(risultato.righe.map((r) => r.garaNumero)).toEqual(["1568", "1575"]);
    expect(risultato.righe.map((r) => r.giornata)).toEqual(["1", "2"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";

vi.mock("server-only", () => ({}));

const { analizzaExportFederale } = await import("./parser");

const INTESTAZIONI = [
  "Stag",
  "Matricola",
  "Cognome e Nome",
  "M/F",
  "Codice Fiscale",
  "Data Nascita",
  "Località Nascita",
  "Pr.Nasc.",
  "Indirizzo",
  "CAP",
  "Località Residenza",
  "Pr.",
  "Categ.",
  "Data 1° Tess.",
  "Data Inizio Val.Cert",
  "Data Fine Val.Cert",
  "Mesi Validità Cert",
  "Modulo",
];

async function creaWorkbookDiTest(righe: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Atlete");
  // Le intestazioni reali sono alla riga 5 (righe 1-4 sono altro contenuto
  // dell'export, non rilevante per il parsing).
  sheet.addRow(["riga 1 - non rilevante"]);
  sheet.addRow(["riga 2 - non rilevante"]);
  sheet.addRow(["riga 3 - non rilevante"]);
  sheet.addRow(["riga 4 - non rilevante"]);
  sheet.addRow(INTESTAZIONI);
  righe.forEach((riga) => sheet.addRow(riga));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function rigaCompleta(overrides: Record<string, string | number> = {}) {
  const base: Record<string, string | number> = {
    Stag: "2025/2026",
    Matricola: "12345",
    "Cognome e Nome": "Rossi Maria",
    "M/F": "F",
    "Codice Fiscale": "RSSMRA10A41H501Z",
    "Data Nascita": "01/05/2010",
    "Località Nascita": "Roma",
    "Pr.Nasc.": "RM",
    Indirizzo: "Via Roma 1",
    CAP: "00100",
    "Località Residenza": "Roma",
    "Pr.": "RM",
    "Categ.": "Under 16",
    "Data 1° Tess.": "01/09/2020",
    "Data Inizio Val.Cert": "01/06/2026",
    "Data Fine Val.Cert": "01/06/2027",
    "Mesi Validità Cert": 12,
    Modulo: "A",
  };
  return { ...base, ...overrides };
}

describe("analizzaExportFederale", () => {
  it("maps a valid row and normalizes gg/mm/aaaa dates to Date objects", async () => {
    const riga = rigaCompleta();
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toHaveLength(1);
    const atleta = risultato.righe[0];
    expect(atleta.codiceFiscale).toBe("RSSMRA10A41H501Z");
    expect(atleta.nome).toBe("Rossi Maria");
    expect(atleta.sesso).toBe("F");
    expect(atleta.dataNascita.toISOString().slice(0, 10)).toBe("2010-05-01");
    expect(atleta.dataPrimoTesseramento?.toISOString().slice(0, 10)).toBe(
      "2020-09-01"
    );
    expect(atleta.categoria).toBe("Under 16");
    expect(atleta.certificato.dataInizioValidita?.toISOString().slice(0, 10)).toBe(
      "2026-06-01"
    );
    expect(atleta.certificato.dataFineValidita?.toISOString().slice(0, 10)).toBe(
      "2027-06-01"
    );
    expect(atleta.certificato.mesiValidita).toBe(12);
    expect(atleta.certificato.modulo).toBe("A");
  });

  it("maps a row with no certificate data at all without discarding it (AC #3)", async () => {
    const riga = rigaCompleta({
      "Data Inizio Val.Cert": "",
      "Data Fine Val.Cert": "",
      "Mesi Validità Cert": "",
      Modulo: "",
    });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].certificato).toEqual({
      dataInizioValidita: null,
      dataFineValidita: null,
      mesiValidita: null,
      modulo: null,
    });
  });

  it("maps a row with an unparseable certificate expiry date as null, without discarding it (AC #3)", async () => {
    const riga = rigaCompleta({ "Data Fine Val.Cert": "31/02/2027" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].certificato.dataFineValidita).toBeNull();
  });

  it("maps a row with a non-numeric Mesi Validità Cert as null, without discarding it", async () => {
    const riga = rigaCompleta({ "Mesi Validità Cert": "dodici" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe[0].certificato.mesiValidita).toBeNull();
  });

  it("maps a non-integer Mesi Validità Cert as null instead of forwarding a decimal to an INTEGER column (review fix)", async () => {
    const riga = rigaCompleta({ "Mesi Validità Cert": "12.5" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.scartate).toEqual([]);
    expect(risultato.righe[0].certificato.mesiValidita).toBeNull();
  });

  it("discards a row with a missing Codice Fiscale, without failing the whole import (AC #3)", async () => {
    const riga = rigaCompleta({ "Codice Fiscale": "" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe).toEqual([]);
    expect(risultato.scartate).toHaveLength(1);
    expect(risultato.scartate[0].motivo).toMatch(/codice fiscale/i);
  });

  it("processes remaining valid rows even when one row is discarded", async () => {
    const rigaValida = rigaCompleta({
      "Codice Fiscale": "VLDCF00A00A000A",
    });
    const rigaScartata = rigaCompleta({ "Codice Fiscale": "" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => rigaScartata[h]),
      INTESTAZIONI.map((h) => rigaValida[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].codiceFiscale).toBe("VLDCF00A00A000A");
    expect(risultato.scartate).toHaveLength(1);
  });

  it("normalizes Codice Fiscale to trimmed uppercase (review fix)", async () => {
    const riga = rigaCompleta({ "Codice Fiscale": "  rssmra10a41h501z  " });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe[0].codiceFiscale).toBe("RSSMRA10A41H501Z");
  });

  it("discards a row with a blank Cognome e Nome (review fix, consistency with CF/Data/Sesso)", async () => {
    const riga = rigaCompleta({ "Cognome e Nome": "" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe).toEqual([]);
    expect(risultato.scartate).toHaveLength(1);
    expect(risultato.scartate[0].motivo).toMatch(/nome/i);
  });

  it("discards a row with an invalid calendar date instead of silently rolling it over (review fix)", async () => {
    const riga = rigaCompleta({ "Data Nascita": "31/02/2020" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe).toEqual([]);
    expect(risultato.scartate).toHaveLength(1);
    expect(risultato.scartate[0].motivo).toMatch(/data nascita/i);
  });

  it("discards a later row with a Codice Fiscale duplicated within the same file (review fix)", async () => {
    const riga1 = rigaCompleta({ "Cognome e Nome": "Prima Riga" });
    const riga2 = rigaCompleta({ "Cognome e Nome": "Seconda Riga" });
    const buffer = await creaWorkbookDiTest([
      INTESTAZIONI.map((h) => riga1[h]),
      INTESTAZIONI.map((h) => riga2[h]),
    ]);

    const risultato = await analizzaExportFederale(buffer);

    expect(risultato.righe).toHaveLength(1);
    expect(risultato.righe[0].nome).toBe("Prima Riga");
    expect(risultato.scartate).toHaveLength(1);
    expect(risultato.scartate[0].motivo).toMatch(/duplicat/i);
  });

  it("returns an upfront error when essential columns are not found in the header row (review fix)", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Atlete");
    sheet.addRow(["riga 1"]);
    sheet.addRow(["riga 2"]);
    sheet.addRow(["riga 3"]);
    sheet.addRow(["riga 4"]);
    sheet.addRow(["Intestazione Sbagliata", "Altra Colonna"]);
    sheet.addRow(["valore 1", "valore 2"]);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await expect(analizzaExportFederale(buffer)).rejects.toThrow(
      /intestazion|colonn/i
    );
  });
});

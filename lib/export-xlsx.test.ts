import { describe, expect, it } from "vitest";
import {
  crc32,
  escapeXml,
  generaXlsx,
  letteraColonna,
  nomeFileExport,
  rispostaDownloadXlsx,
  serialeDataExcel,
} from "./export-xlsx";

// Lettore minimo degli zip "stored" prodotti da creaZipStored: scorre gli
// header locali (nessuna compressione, dimensioni note) e verifica il CRC.
function leggiZip(zip: Uint8Array): Map<string, string> {
  const vista = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const file = new Map<string, string>();
  let posizione = 0;
  while (vista.getUint32(posizione, true) === 0x04034b50) {
    expect(vista.getUint16(posizione + 8, true)).toBe(0);
    const crc = vista.getUint32(posizione + 14, true);
    const dimensione = vista.getUint32(posizione + 18, true);
    const lunghezzaNome = vista.getUint16(posizione + 26, true);
    const nome = decoder.decode(zip.subarray(posizione + 30, posizione + 30 + lunghezzaNome));
    const inizio = posizione + 30 + lunghezzaNome;
    const contenuto = zip.subarray(inizio, inizio + dimensione);
    expect(crc32(contenuto)).toBe(crc);
    file.set(nome, decoder.decode(contenuto));
    posizione = inizio + dimensione;
  }
  // Dopo i file: directory centrale, poi il record di fine con il numero di voci.
  const fine = zip.byteLength - 22;
  expect(vista.getUint32(fine, true)).toBe(0x06054b50);
  expect(vista.getUint16(fine + 10, true)).toBe(file.size);
  return file;
}

describe("generaXlsx (Story 28.1)", () => {
  it("produce un pacchetto .xlsx con tutte le parti richieste", () => {
    const file = leggiZip(
      generaXlsx({ nome: "Certificati", intestazioni: ["Atleta"], righe: [["Rossi Anna"]] })
    );

    expect([...file.keys()].sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(file.get("xl/workbook.xml")).toContain('<sheet name="Certificati"');
  });

  it("scrive intestazioni in grassetto, testo inline, numeri e date come valori Excel", () => {
    const data = new Date("2026-10-25T00:00:00.000Z");
    const foglio = leggiZip(
      generaXlsx({
        nome: "Prova",
        intestazioni: ["Nome", "Mesi", "Scadenza"],
        righe: [["Rossi Anna", 12, data]],
      })
    ).get("xl/worksheets/sheet1.xml")!;

    expect(foglio).toContain(
      '<c r="A1" t="inlineStr" s="2"><is><t xml:space="preserve">Nome</t></is></c>'
    );
    expect(foglio).toContain(
      '<c r="A2" t="inlineStr"><is><t xml:space="preserve">Rossi Anna</t></is></c>'
    );
    expect(foglio).toContain('<c r="B2"><v>12</v></c>');
    expect(foglio).toContain(`<c r="C2" s="1"><v>${serialeDataExcel(data)}</v></c>`);
    expect(foglio).toContain('<autoFilter ref="A1:C2"/>');
    expect(foglio).toContain('state="frozen"');
  });

  it("non scrive mai formule: testo che inizia con = + - @ resta testo", () => {
    const foglio = leggiZip(
      generaXlsx({
        nome: "Prova",
        intestazioni: ["A", "B", "C", "D"],
        righe: [['=HYPERLINK("x")', "+1", "-1", "@SUM(A1)"]],
      })
    ).get("xl/worksheets/sheet1.xml")!;

    expect(foglio).not.toContain("<f>");
    expect(foglio).toContain("=HYPERLINK(&quot;x&quot;)");
    expect(foglio.match(/t="inlineStr"/g)).toHaveLength(8);
  });

  it("lascia vuote le celle null, undefined, stringa vuota, NaN e date non valide", () => {
    const foglio = leggiZip(
      generaXlsx({
        nome: "Prova",
        intestazioni: ["A"],
        righe: [[null, undefined, "", Number.NaN, new Date("non valida")]],
      })
    ).get("xl/worksheets/sheet1.xml")!;

    expect(foglio).toContain('<row r="2"></row>');
  });

  it("fa l'escape di XML e rimuove i caratteri di controllo non ammessi", () => {
    expect(escapeXml('A & B <c> "d"\u0001')).toBe("A &amp; B &lt;c&gt; &quot;d&quot;");
    expect(escapeXml("riga1\nriga2\tfine")).toBe("riga1\nriga2\tfine");
  });

  it("rende valido il nome del foglio", () => {
    const workbook = leggiZip(
      generaXlsx({
        nome: "Certificati: 2026/27 [bozza] con un nome molto lungo",
        intestazioni: [],
        righe: [],
      })
    ).get("xl/workbook.xml")!;

    const nome = workbook.match(/<sheet name="([^"]*)"/)![1];
    expect(nome.length).toBeLessThanOrEqual(31);
    expect(nome).not.toMatch(/[[\]:*?/\\]/);
  });
});

describe("helper export-xlsx (Story 28.1)", () => {
  it("letteraColonna converte gli indici in lettere Excel", () => {
    expect(letteraColonna(0)).toBe("A");
    expect(letteraColonna(25)).toBe("Z");
    expect(letteraColonna(26)).toBe("AA");
    expect(letteraColonna(701)).toBe("ZZ");
    expect(letteraColonna(702)).toBe("AAA");
  });

  it("serialeDataExcel usa il sistema 1900 in UTC", () => {
    expect(serialeDataExcel(new Date("1970-01-01T00:00:00.000Z"))).toBe(25569);
    expect(serialeDataExcel(new Date("2026-01-01T00:00:00.000Z"))).toBe(46023);
  });

  it("crc32 coincide con il valore di riferimento", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("nomeFileExport include la stagione", () => {
    expect(nomeFileExport("certificati", 2026)).toBe("certificati-2026-2027.xlsx");
  });

  it("rispostaDownloadXlsx imposta tipo, allegato e no-store", () => {
    const risposta = rispostaDownloadXlsx(new Uint8Array([1, 2]), "certificati-2026-2027.xlsx");

    expect(risposta.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(risposta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="certificati-2026-2027.xlsx"'
    );
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
  });
});

// Story 28.1 (Epic 28, Export dati): writer .xlsx minimale, condiviso da
// tutti gli export (certificati, iscrizioni, tesseramenti, complessivo).
// Scritto a mano invece di exceljs/SheetJS per non appesantire il bundle del
// Worker Cloudflare: un solo foglio, SpreadsheetML essenziale e uno zip
// "stored" (senza compressione) - Excel e LibreOffice lo aprono senza
// avvisi, il file resta di poche decine di KB per qualche centinaio di righe.
//
// Le celle testo sono SEMPRE scritte come stringhe inline (t="inlineStr"),
// mai come formule: un valore che inizia con "=", "+", "-" o "@" resta
// testo (niente formula injection all'apertura del file).

export type CellaXlsx = string | number | Date | null | undefined;

export type FoglioXlsx = {
  nome: string;
  intestazioni: string[];
  righe: CellaXlsx[][];
};

// Indici in cellXfs di STILI_XML sotto.
const STILE_DATA = 1;
const STILE_INTESTAZIONE = 2;

const MS_GIORNO = 86_400_000;
// 1970-01-01 come numero seriale Excel (sistema 1900).
const SERIALE_EPOCH_UNIX = 25_569;

export function letteraColonna(indice: number): string {
  let n = indice + 1;
  let lettere = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    lettere = String.fromCharCode(65 + resto) + lettere;
    n = Math.floor((n - 1) / 26);
  }
  return lettere;
}

// Le date dell'app sono date di calendario salvate a mezzanotte UTC: il
// seriale si calcola in UTC, cosi' il giorno mostrato da Excel e' lo stesso
// mostrato dalla pagina.
export function serialeDataExcel(data: Date): number {
  return data.getTime() / MS_GIORNO + SERIALE_EPOCH_UNIX;
}

// Rimuove i caratteri di controllo non ammessi in XML 1.0 (tab, a capo e
// ritorno carrello restano) e fa l'escape dei caratteri speciali.
export function escapeXml(testo: string): string {
  return testo
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Excel rifiuta nomi foglio con []:*?/\ o piu' lunghi di 31 caratteri.
function nomeFoglioValido(nome: string): string {
  const pulito = nome.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return pulito || "Foglio1";
}

function cellaXml(riferimento: string, valore: CellaXlsx, stile?: number): string {
  const attributoStile = stile ? ` s="${stile}"` : "";
  if (valore === null || valore === undefined || valore === "") {
    return "";
  }
  if (valore instanceof Date) {
    if (Number.isNaN(valore.getTime())) return "";
    return `<c r="${riferimento}" s="${STILE_DATA}"><v>${serialeDataExcel(valore)}</v></c>`;
  }
  if (typeof valore === "number") {
    if (!Number.isFinite(valore)) return "";
    return `<c r="${riferimento}"${attributoStile}><v>${valore}</v></c>`;
  }
  return `<c r="${riferimento}" t="inlineStr"${attributoStile}><is><t xml:space="preserve">${escapeXml(valore)}</t></is></c>`;
}

function lunghezzaVisibile(valore: CellaXlsx): number {
  if (valore === null || valore === undefined) return 0;
  if (valore instanceof Date) return 10;
  return String(valore).length;
}

function foglioXml(foglio: FoglioXlsx): string {
  // reduce e non Math.max(...righe): lo spread passa un argomento per riga
  // e con decine di migliaia di righe supera il limite dello stack.
  const numeroColonne = foglio.righe.reduce(
    (massimo, riga) => Math.max(massimo, riga.length),
    foglio.intestazioni.length
  );

  const larghezze = Array.from({ length: numeroColonne }, (_, colonna) => {
    const massima = foglio.righe.reduce(
      (massimo, riga) => Math.max(massimo, lunghezzaVisibile(riga[colonna])),
      lunghezzaVisibile(foglio.intestazioni[colonna])
    );
    return Math.min(Math.max(massima + 2, 8), 60);
  });

  const colsXml = larghezze
    .map(
      (larghezza, colonna) =>
        `<col min="${colonna + 1}" max="${colonna + 1}" width="${larghezza}" customWidth="1"/>`
    )
    .join("");

  const righeXml = [foglio.intestazioni as CellaXlsx[], ...foglio.righe]
    .map((riga, indiceRiga) => {
      const numeroRiga = indiceRiga + 1;
      const stile = indiceRiga === 0 ? STILE_INTESTAZIONE : undefined;
      const celle = riga
        .map((valore, colonna) =>
          cellaXml(`${letteraColonna(colonna)}${numeroRiga}`, valore, stile)
        )
        .join("");
      return `<row r="${numeroRiga}">${celle}</row>`;
    })
    .join("");

  // Riga di intestazione bloccata (pane ySplit=1) e filtro automatico sulle
  // colonne: comodi su elenchi di qualche centinaio di Atlete.
  const ultimaCella = `${letteraColonna(Math.max(numeroColonne - 1, 0))}${foglio.righe.length + 1}`;

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    (colsXml ? `<cols>${colsXml}</cols>` : "") +
    `<sheetData>${righeXml}</sheetData>` +
    (numeroColonne > 0 ? `<autoFilter ref="A1:${ultimaCella}"/>` : "") +
    `</worksheet>`
  );
}

const CONTENT_TYPES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `</Types>`;

const RELS_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const WORKBOOK_RELS_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `</Relationships>`;

// cellXfs: 0 = predefinito, 1 = data gg/mm/aaaa (formato personalizzato 164,
// indipendente dalle impostazioni locali di chi apre il file), 2 =
// intestazione in grassetto.
const STILI_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

function workbookXml(nomeFoglio: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${escapeXml(nomeFoglioValido(nomeFoglio))}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`
  );
}

// --- zip "stored" (metodo 0, nessuna compressione) ---------------------

const TABELLA_CRC32 = (() => {
  const tabella = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabella[n] = c >>> 0;
  }
  return tabella;
})();

export function crc32(dati: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < dati.length; i++) {
    crc = TABELLA_CRC32[(crc ^ dati[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function creaZipStored(file: { nome: string; contenuto: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parti: Uint8Array[] = [];
  const centrale: Uint8Array[] = [];
  let offset = 0;

  for (const { nome, contenuto } of file) {
    const nomeBytes = encoder.encode(nome);
    const crc = crc32(contenuto);

    const locale = new Uint8Array(30 + nomeBytes.length);
    const vl = new DataView(locale.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true); // versione richiesta
    vl.setUint16(6, 0x0800, true); // nomi in UTF-8
    vl.setUint16(8, 0, true); // metodo: stored
    vl.setUint16(10, 0, true); // ora DOS
    vl.setUint16(12, 0x21, true); // data DOS 1980-01-01
    vl.setUint32(14, crc, true);
    vl.setUint32(18, contenuto.length, true);
    vl.setUint32(22, contenuto.length, true);
    vl.setUint16(26, nomeBytes.length, true);
    vl.setUint16(28, 0, true);
    locale.set(nomeBytes, 30);

    const voce = new Uint8Array(46 + nomeBytes.length);
    const vc = new DataView(voce.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true);
    vc.setUint16(6, 20, true);
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(10, 0, true);
    vc.setUint16(12, 0, true);
    vc.setUint16(14, 0x21, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, contenuto.length, true);
    vc.setUint32(24, contenuto.length, true);
    vc.setUint16(28, nomeBytes.length, true);
    vc.setUint32(42, offset, true);
    voce.set(nomeBytes, 46);

    parti.push(locale, contenuto);
    centrale.push(voce);
    offset += locale.length + contenuto.length;
  }

  const dimensioneCentrale = centrale.reduce((somma, v) => somma + v.length, 0);
  const fine = new Uint8Array(22);
  const vf = new DataView(fine.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, file.length, true);
  vf.setUint16(10, file.length, true);
  vf.setUint32(12, dimensioneCentrale, true);
  vf.setUint32(16, offset, true);

  const tutte = [...parti, ...centrale, fine];
  const risultato = new Uint8Array(tutte.reduce((somma, p) => somma + p.length, 0));
  let posizione = 0;
  for (const parte of tutte) {
    risultato.set(parte, posizione);
    posizione += parte.length;
  }
  return risultato;
}

export function generaXlsx(foglio: FoglioXlsx): Uint8Array {
  const encoder = new TextEncoder();
  return creaZipStored([
    { nome: "[Content_Types].xml", contenuto: encoder.encode(CONTENT_TYPES_XML) },
    { nome: "_rels/.rels", contenuto: encoder.encode(RELS_XML) },
    { nome: "xl/workbook.xml", contenuto: encoder.encode(workbookXml(foglio.nome)) },
    { nome: "xl/_rels/workbook.xml.rels", contenuto: encoder.encode(WORKBOOK_RELS_XML) },
    { nome: "xl/styles.xml", contenuto: encoder.encode(STILI_XML) },
    { nome: "xl/worksheets/sheet1.xml", contenuto: encoder.encode(foglioXml(foglio)) },
  ]);
}

// ("certificati", 2026) -> "certificati-2026-2027.xlsx": l'anno di inizio
// e' quello di calcolaIntervalloStagioneCorrente (stagione agosto-giugno).
export function nomeFileExport(sezione: string, annoInizioStagione: number): string {
  return `${sezione}-${annoInizioStagione}-${annoInizioStagione + 1}.xlsx`;
}

// no-store: il file contiene dati personali (anche di minori), nessuna
// cache intermedia o del browser deve conservarlo.
export function rispostaDownloadXlsx(contenuto: Uint8Array, nomeFile: string): Response {
  return new Response(contenuto as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
      "Cache-Control": "no-store",
    },
  });
}

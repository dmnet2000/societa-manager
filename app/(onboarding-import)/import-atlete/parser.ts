import "server-only";
import ExcelJS from "exceljs";

export type DatiCertificatoImportato = {
  dataInizioValidita: Date | null;
  dataFineValidita: Date | null;
  mesiValidita: number | null;
  modulo: string | null;
};

export type RigaAtletaImportata = {
  codiceFiscale: string;
  nome: string;
  sesso: "M" | "F";
  dataNascita: Date;
  luogoNascita: string | null;
  provinciaNascita: string | null;
  indirizzo: string | null;
  cap: string | null;
  localitaResidenza: string | null;
  provinciaResidenza: string | null;
  categoria: string | null;
  matricola: string | null;
  dataPrimoTesseramento: Date | null;
  // Story 1.7: nessuna di queste colonne e' tra COLONNE_ESSENZIALI - un
  // valore mancante/non parsabile diventa null, la riga non viene scartata
  // (AC #3, a differenza dei campi identitari di Atleta).
  certificato: DatiCertificatoImportato;
};

export type RigaScartata = {
  numeroRiga: number;
  motivo: string;
};

export type RisultatoParsing = {
  righe: RigaAtletaImportata[];
  scartate: RigaScartata[];
};

// Intestazioni alla riga 5 dell'export federale (confermato dall'utente in
// fase di brief) - le righe 1-4 contengono altro contenuto non rilevante.
const RIGA_INTESTAZIONI = 5;

// Colonne senza le quali il file non è riconoscibile come export federale -
// se mancano, meglio un unico errore chiaro che scartare ogni riga con un
// motivo fuorviante (review Story 1.3).
const COLONNE_ESSENZIALI = ["Codice Fiscale", "Cognome e Nome", "Data Nascita", "M/F"];

function testoCella(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const testo = String(value).trim();
  return testo === "" ? null : testo;
}

// Le date nell'export sono stringhe "gg/mm/aaaa", non date native Excel
// (confermato nell'addendum) - normalizzate qui prima della persistenza
// (AC #2). Gestisce difensivamente anche una Date nativa, se presente.
// Valida anche che giorno/mese/anno corrispondano davvero alla data
// costruita (Date.UTC altrimenti farebbe rollover silenzioso di date
// inesistenti come 31/02 - review Story 1.3).
function parseDataItaliana(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) {
    return value;
  }
  const testo = testoCella(value);
  if (!testo) {
    return null;
  }
  const match = testo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, giornoTesto, meseTesto, annoTesto] = match;
  const giorno = Number(giornoTesto);
  const mese = Number(meseTesto);
  const anno = Number(annoTesto);
  const data = new Date(Date.UTC(anno, mese - 1, giorno));

  const eValida =
    data.getUTCFullYear() === anno &&
    data.getUTCMonth() === mese - 1 &&
    data.getUTCDate() === giorno;

  return eValida ? data : null;
}

// "Mesi Validità Cert" - numero intero, null se assente o non parsabile
// (Story 1.7, AC #3 - mai un motivo di scarto della riga). Deve essere un
// intero (colonna Postgres INTEGER, review fix): un valore decimale o in
// notazione scientifica diventa null invece di rischiare di far fallire
// l'insert/update sul Certificato.
function parseNumeroCella(value: ExcelJS.CellValue): number | null {
  const testo = testoCella(value);
  if (!testo) {
    return null;
  }
  const numero = Number(testo);
  return Number.isInteger(numero) ? numero : null;
}

export async function analizzaExportFederale(
  buffer: Buffer
): Promise<RisultatoParsing> {
  const workbook = new ExcelJS.Workbook();
  // exceljs (4.4.0) dichiara il parametro come un Buffer non generico,
  // incompatibile a livello di tipi con il Buffer<ArrayBufferLike> delle
  // @types/node correnti - compatibile a runtime, mismatch solo nei tipi.
  await workbook.xlsx.load(buffer as never);
  const worksheet = workbook.worksheets[0];

  const intestazioni = worksheet.getRow(RIGA_INTESTAZIONI).values as (
    | string
    | undefined
  )[];
  const indiceColonna = new Map<string, number>();
  intestazioni.forEach((nome, indice) => {
    if (typeof nome === "string" && nome.trim() !== "") {
      indiceColonna.set(nome.trim(), indice);
    }
  });

  const colonneMancanti = COLONNE_ESSENZIALI.filter(
    (nome) => !indiceColonna.has(nome)
  );
  if (colonneMancanti.length > 0) {
    throw new Error(
      `Intestazioni non riconosciute: colonne mancanti alla riga ${RIGA_INTESTAZIONI} (${colonneMancanti.join(", ")}). Verifica che il file sia l'export federale nel formato atteso.`
    );
  }

  function cella(row: ExcelJS.Row, nomeColonna: string): ExcelJS.CellValue {
    const indice = indiceColonna.get(nomeColonna);
    return indice === undefined ? null : row.getCell(indice).value;
  }

  const righe: RigaAtletaImportata[] = [];
  const scartate: RigaScartata[] = [];
  const codiciFiscaliVisti = new Set<string>();

  worksheet.eachRow((row, numeroRiga) => {
    if (numeroRiga <= RIGA_INTESTAZIONI) {
      return;
    }
    if (row.values === undefined || (row.values as unknown[]).length === 0) {
      return;
    }

    // Normalizzato (trim + maiuscolo): senza questo, varianti di
    // maiuscole/minuscole o spazi creerebbero un'Atleta duplicata invece di
    // aggiornare quella esistente (review Story 1.3 - AD-5).
    const codiceFiscale = testoCella(cella(row, "Codice Fiscale"))
      ?.toUpperCase()
      .replace(/\s+/g, "");
    if (!codiceFiscale) {
      scartate.push({
        numeroRiga,
        motivo: "Codice Fiscale mancante o vuoto",
      });
      return;
    }

    if (codiciFiscaliVisti.has(codiceFiscale)) {
      scartate.push({
        numeroRiga,
        motivo: `Codice Fiscale duplicato nel file (già processato in una riga precedente)`,
      });
      return;
    }

    const dataNascita = parseDataItaliana(cella(row, "Data Nascita"));
    if (!dataNascita) {
      scartate.push({
        numeroRiga,
        motivo: "Data Nascita mancante o in formato non riconosciuto",
      });
      return;
    }

    const sessoTesto = testoCella(cella(row, "M/F"));
    const sesso = sessoTesto === "M" || sessoTesto === "F" ? sessoTesto : null;
    if (!sesso) {
      scartate.push({
        numeroRiga,
        motivo: "Campo M/F mancante o non valido",
      });
      return;
    }

    const nome = testoCella(cella(row, "Cognome e Nome"));
    if (!nome) {
      scartate.push({
        numeroRiga,
        motivo: "Cognome e Nome mancante o vuoto",
      });
      return;
    }

    codiciFiscaliVisti.add(codiceFiscale);
    righe.push({
      codiceFiscale,
      nome,
      sesso,
      dataNascita,
      luogoNascita: testoCella(cella(row, "Località Nascita")),
      provinciaNascita: testoCella(cella(row, "Pr.Nasc.")),
      indirizzo: testoCella(cella(row, "Indirizzo")),
      cap: testoCella(cella(row, "CAP")),
      localitaResidenza: testoCella(cella(row, "Località Residenza")),
      provinciaResidenza: testoCella(cella(row, "Pr.")),
      categoria: testoCella(cella(row, "Categ.")),
      matricola: testoCella(cella(row, "Matricola")),
      dataPrimoTesseramento: parseDataItaliana(cella(row, "Data 1° Tess.")),
      certificato: {
        dataInizioValidita: parseDataItaliana(cella(row, "Data Inizio Val.Cert")),
        dataFineValidita: parseDataItaliana(cella(row, "Data Fine Val.Cert")),
        mesiValidita: parseNumeroCella(cella(row, "Mesi Validità Cert")),
        modulo: testoCella(cella(row, "Modulo")),
      },
    });
  });

  return { righe, scartate };
}

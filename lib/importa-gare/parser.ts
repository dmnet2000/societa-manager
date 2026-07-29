import "server-only";
import * as XLSX from "xlsx";
import { parseDataItaliana } from "@/lib/data-italiana";

export type RigaGaraImportata = {
  garaNumero: string;
  giornata: string | null;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  risultato: string | null;
  parziali: string | null;
  statoDescrizione: string | null;
  impianto: string | null;
  indirizzoImpianto: string | null;
};

// Stessa forma { numeroRiga, motivo } di RigaScartata in
// app/(onboarding-import)/import-atlete/parser.ts - non importata da lì
// (evita una direzione di import insolita lib/ -> app/ per un tipo di due
// campi, duplicazione minima accettabile).
export type RigaScartata = {
  numeroRiga: number;
  motivo: string;
};

export type RisultatoParsingGare = {
  righe: RigaGaraImportata[];
  scartate: RigaScartata[];
};

// Colonne senza le quali il file non è riconoscibile come export gare -
// se mancano, un unico errore chiaro invece di scartare ogni riga con un
// motivo fuorviante (stesso principio di COLONNE_ESSENZIALI in
// import-atlete/parser.ts).
const COLONNE_ESSENZIALI = ["Gara N", "Data", "Ora", "SquadraCasa", "SquadraOspite"];

function testoCella(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const testo = String(value).trim();
  return testo === "" ? null : testo;
}

function formattaDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

// Le intestazioni sono sulla prima riga in questo file (a differenza
// dell'export federale Atlete, dove sono alla riga 5) - sheet_to_json usa
// di default la prima riga come chiavi, nessuna mappa colonna->indice
// costruita a mano.
export function analizzaFileGare(buffer: Buffer): RisultatoParsingGare {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const nomeFoglio = workbook.SheetNames[0];
  const sheet = workbook.Sheets[nomeFoglio];

  // Review fix: le intestazioni sono lette direttamente dalla riga 1 (modo
  // header:1, valori grezzi), non dalle chiavi della prima riga dati -
  // sheet_to_json omette dalle chiavi di una riga le celle vuote, quindi
  // una riga dati con una cella essenziale vuota (caso legittimo, gestito
  // sotto da AC #4) faceva fallire il controllo colonne mancanti anche con
  // un'intestazione perfettamente valida. Anche il `.trim()` (review fix)
  // evita un falso "colonne mancanti" per un'intestazione con spazi
  // superflui, stesso principio di import-atlete/parser.ts.
  const primaRigaIntestazione = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
  })[0];
  const intestazioni = (primaRigaIntestazione ?? []).map((valore) =>
    String(valore ?? "").trim()
  );
  const intestazioniTrovate = new Set(intestazioni);
  const colonneMancanti = COLONNE_ESSENZIALI.filter(
    (nome) => !intestazioniTrovate.has(nome)
  );
  if (colonneMancanti.length > 0) {
    throw new Error(
      `Intestazioni non riconosciute: colonne mancanti (${colonneMancanti.join(", ")}). Verifica che il file sia l'export gare nel formato atteso.`
    );
  }

  // Righe ricostruite usando le intestazioni gia' normalizzate (trim) sopra
  // come chiavi esplicite (con range:1 per saltare la riga di intestazione
  // reale) - non il modo automatico di sheet_to_json, che userebbe il testo
  // grezzo non-trimmato della riga 1 come chiavi: un'intestazione con spazi
  // superflui avrebbe altrimenti superato il controllo colonne mancanti ma
  // reso irraggiungibili i valori tramite riga["Gara N"] eccetera sotto.
  const righeGrezze = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: intestazioni,
    range: 1,
  });

  if (righeGrezze.length === 0) {
    throw new Error(
      "Il file contiene solo l'intestazione, nessuna gara da importare."
    );
  }

  const righe: RigaGaraImportata[] = [];
  const scartate: RigaScartata[] = [];

  righeGrezze.forEach((riga, indice) => {
    // Riga 1 = intestazioni, quindi la prima riga dati e' la riga Excel 2.
    const numeroRiga = indice + 2;

    // Gara N/Giornata arrivano come "number" da xlsx quando la cella
    // contiene solo cifre - testoCella coercisce esplicitamente a stringa.
    const garaNumero = testoCella(riga["Gara N"]);
    if (!garaNumero) {
      scartate.push({ numeroRiga, motivo: "Gara N mancante o vuoto" });
      return;
    }

    const dataParsata = parseDataItaliana(riga["Data"]);
    if (!dataParsata) {
      scartate.push({
        numeroRiga,
        motivo: "Data mancante o in formato non riconosciuto",
      });
      return;
    }

    const ora = testoCella(riga["Ora"]);
    if (!ora) {
      scartate.push({ numeroRiga, motivo: "Ora mancante o vuota" });
      return;
    }

    const squadraCasa = testoCella(riga["SquadraCasa"]);
    if (!squadraCasa) {
      scartate.push({ numeroRiga, motivo: "SquadraCasa mancante o vuota" });
      return;
    }

    const squadraOspite = testoCella(riga["SquadraOspite"]);
    if (!squadraOspite) {
      scartate.push({ numeroRiga, motivo: "SquadraOspite mancante o vuota" });
      return;
    }

    righe.push({
      garaNumero,
      giornata: testoCella(riga["Giornata"]),
      // Mai salvare un oggetto Date - Partita.data e' una stringa
      // "YYYY-MM-DD" (stesso principio di Presenza.data/Slot.oraInizio).
      data: formattaDataIso(dataParsata),
      ora,
      squadraCasa,
      squadraOspite,
      risultato: testoCella(riga["Risultato"]),
      parziali: testoCella(riga["Parziali"]),
      statoDescrizione: testoCella(riga["StatoDescrizione"]),
      impianto: testoCella(riga["Impianto"]),
      indirizzoImpianto: testoCella(riga["IndirizzoImpianto"]),
    });
  });

  return { righe, scartate };
}

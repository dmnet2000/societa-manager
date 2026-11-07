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
  const righeIniziali = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
  });
  const primaRigaIntestazione = righeIniziali[0];
  const intestazioni = (primaRigaIntestazione ?? []).map((valore) =>
    String(valore ?? "").trim()
  );
  const intestazioniTrovate = new Set(intestazioni);
  const colonneMancanti = COLONNE_ESSENZIALI.filter(
    (nome) => !intestazioniTrovate.has(nome)
  );
  if (colonneMancanti.length > 0) {
    // Non e' l'export FIPAV: prova il calendario CSI (intestazioni diverse,
    // precedute da una riga titolo) prima di dare l'errore.
    const rigaIntestazioneCsi = trovaIntestazioneCsi(righeIniziali);
    if (rigaIntestazioneCsi !== null) {
      return analizzaFormatoCsi(sheet, rigaIntestazioneCsi);
    }
    throw new Error(
      `Intestazioni non riconosciute: colonne mancanti (${colonneMancanti.join(", ")}). Verifica che il file sia l'export gare FIPAV o il calendario CSI nel formato atteso.`
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

// Calendario CSI: riga titolo (es. "U17 CSI") e intestazioni sotto, colonne
// con nomi diversi dall'export FIPAV, data come data nativa Excel, impianto e
// indirizzo nella stessa cella "Campo", nessun risultato. La colonna "Giorno"
// e' ignorata di proposito: nei file reali a volte non corrisponde alla Data,
// che e' quella corretta, e il giorno della settimana si ricava dalla data.
const COLONNE_CSI = {
  gara: "Gara",
  fase: "Fase",
  giornata: "Giornata",
  squadraCasa: "Squadra di casa (1ª nominata)",
  squadraOspite: "Squadra ospite (2ª nominata)",
  data: "Data",
  ora: "Ora",
  campo: "Campo",
};
const COLONNE_ESSENZIALI_CSI = [
  COLONNE_CSI.gara,
  COLONNE_CSI.squadraCasa,
  COLONNE_CSI.squadraOspite,
  COLONNE_CSI.data,
  COLONNE_CSI.ora,
];
// Il titolo occupa le prime righe: l'intestazione e' cercata solo li'.
const RIGHE_CERCA_INTESTAZIONE_CSI = 10;

function trovaIntestazioneCsi(righe: unknown[][]): number | null {
  const limite = Math.min(righe.length, RIGHE_CERCA_INTESTAZIONE_CSI);
  for (let indice = 0; indice < limite; indice++) {
    const celle = new Set(
      (righe[indice] ?? []).map((valore) => String(valore ?? "").trim())
    );
    if (COLONNE_ESSENZIALI_CSI.every((nome) => celle.has(nome))) {
      return indice;
    }
  }
  return null;
}

// Data nativa Excel (numero seriale) oppure, difensivamente, testo
// "gg/mm/aaaa" come nell'export FIPAV.
function parseDataCsi(value: unknown): Date | null {
  if (typeof value === "number") {
    const parti = XLSX.SSF.parse_date_code(value);
    if (!parti || !parti.y) return null;
    return new Date(Date.UTC(parti.y, parti.m - 1, parti.d));
  }
  return parseDataItaliana(value);
}

// "10:30" come testo, oppure ora nativa Excel (frazione di giorno).
function parseOraCsi(value: unknown): string | null {
  if (typeof value === "number") {
    const minutiTotali = Math.round((value % 1) * 24 * 60);
    const ore = Math.floor(minutiTotali / 60) % 24;
    const minuti = minutiTotali % 60;
    return `${String(ore).padStart(2, "0")}:${String(minuti).padStart(2, "0")}`;
  }
  return testoCella(value);
}

// "Palestra Toti Via Marconi, 1 - 30024 Musile di Piave VE": il nome
// dell'impianto finisce dove inizia la via. Se la via non e' riconoscibile
// l'intera cella resta sia impianto sia indirizzo (il link Naviga usa
// l'indirizzo, meglio completo che vuoto).
const INIZIO_INDIRIZZO =
  /\s(?=(Via|Viale|Piazza|Piazzale|Corso|Largo|Vicolo|Strada|Contrada|Località|Loc\.)\s)/i;

function dividiCampoCsi(campo: string | null): {
  impianto: string | null;
  indirizzoImpianto: string | null;
} {
  if (!campo) return { impianto: null, indirizzoImpianto: null };
  const match = INIZIO_INDIRIZZO.exec(campo);
  if (!match || match.index === 0) {
    return { impianto: campo, indirizzoImpianto: campo };
  }
  return {
    impianto: campo.slice(0, match.index).trim(),
    indirizzoImpianto: campo.slice(match.index).trim(),
  };
}

function analizzaFormatoCsi(
  sheet: XLSX.WorkSheet,
  rigaIntestazione: number
): RisultatoParsingGare {
  const intestazioni = (
    XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[rigaIntestazione] ?? []
  ).map((valore) => String(valore ?? "").trim());

  const righeGrezze = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: intestazioni,
    range: rigaIntestazione + 1,
    blankrows: false,
  });

  if (righeGrezze.length === 0) {
    throw new Error(
      "Il file contiene solo l'intestazione, nessuna gara da importare."
    );
  }

  const righe: RigaGaraImportata[] = [];
  const scartate: RigaScartata[] = [];

  righeGrezze.forEach((riga, indice) => {
    // Righe Excel 1-based: la prima riga dati segue l'intestazione.
    const numeroRiga = rigaIntestazione + indice + 2;

    const garaNumero = testoCella(riga[COLONNE_CSI.gara]);
    if (!garaNumero) {
      scartate.push({ numeroRiga, motivo: "Gara mancante o vuota" });
      return;
    }

    const dataParsata = parseDataCsi(riga[COLONNE_CSI.data]);
    if (!dataParsata) {
      scartate.push({
        numeroRiga,
        motivo: "Data mancante o in formato non riconosciuto",
      });
      return;
    }

    const ora = parseOraCsi(riga[COLONNE_CSI.ora]);
    if (!ora) {
      scartate.push({ numeroRiga, motivo: "Ora mancante o vuota" });
      return;
    }

    const squadraCasa = testoCella(riga[COLONNE_CSI.squadraCasa]);
    if (!squadraCasa) {
      scartate.push({ numeroRiga, motivo: "Squadra di casa mancante o vuota" });
      return;
    }

    const squadraOspite = testoCella(riga[COLONNE_CSI.squadraOspite]);
    if (!squadraOspite) {
      scartate.push({ numeroRiga, motivo: "Squadra ospite mancante o vuota" });
      return;
    }

    // La numerazione delle giornate ricomincia al Ritorno: la Fase la
    // distingue ("1ª Andata" / "1ª Ritorno").
    const numeroGiornata = testoCella(riga[COLONNE_CSI.giornata]);
    const fase = testoCella(riga[COLONNE_CSI.fase]);
    const giornata = numeroGiornata
      ? [/^\d+$/.test(numeroGiornata) ? `${numeroGiornata}ª` : numeroGiornata, fase]
          .filter(Boolean)
          .join(" ")
      : fase;

    righe.push({
      garaNumero,
      giornata,
      data: formattaDataIso(dataParsata),
      ora,
      squadraCasa,
      squadraOspite,
      risultato: null,
      parziali: null,
      statoDescrizione: null,
      ...dividiCampoCsi(testoCella(riga[COLONNE_CSI.campo])),
    });
  });

  return { righe, scartate };
}

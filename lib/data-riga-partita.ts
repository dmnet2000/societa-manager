// Story 18.35: blocco data della "riga partita" in stile Match Week
// (app/RigaPartita.tsx) - giorno abbreviato, numero del giorno a due cifre,
// mese abbreviato, tutto maiuscolo (es. "MER" / "30" / "SET").
// Stesso principio di lib/griglia-mensile.ts: tutto in UTC (parseDataUtc,
// mai il fuso locale del processo) e nomi italiani letterali, mai
// toLocaleDateString (stessa stringa garantita su qualunque motore/ICU).
import { parseDataUtc } from "./raggruppa-per-settimana";
import { NOMI_MESI } from "./griglia-mensile";

// Indicizzati come getUTCDay(): 0 = domenica.
const GIORNI_ABBREVIATI = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];

// Indicizzati come getUTCMonth(): 0 = gennaio.
const MESI_ABBREVIATI = [
  "GEN",
  "FEB",
  "MAR",
  "APR",
  "MAG",
  "GIU",
  "LUG",
  "AGO",
  "SET",
  "OTT",
  "NOV",
  "DIC",
];

export type DataRigaPartita = {
  giorno: string;
  numero: string;
  mese: string;
};

// null se la stringa non e' parsabile: la riga viene comunque mostrata, con
// il blocco data vuoto (mai un crash per un dato sporco).
export function partiDataRigaPartita(data: string): DataRigaPartita | null {
  const d = parseDataUtc(data);
  if (Number.isNaN(d.getTime())) return null;
  return {
    giorno: GIORNI_ABBREVIATI[d.getUTCDay()],
    numero: String(d.getUTCDate()).padStart(2, "0"),
    mese: MESI_ABBREVIATI[d.getUTCMonth()],
  };
}

// Story 18.35 (review): il blocco data visivo si legge "MER30SET" con uno
// screen reader - le tre parti sono aria-hidden e questa e' la data estesa
// letta al loro posto (es. "mercoledì 30 settembre 2026"). Stesse regole:
// UTC, nomi letterali.
const GIORNI_ESTESI = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

export function dataEstesaRigaPartita(data: string): string | null {
  const d = parseDataUtc(data);
  if (Number.isNaN(d.getTime())) return null;
  return `${GIORNI_ESTESI[d.getUTCDay()]} ${d.getUTCDate()} ${NOMI_MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

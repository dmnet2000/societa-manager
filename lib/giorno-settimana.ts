import type { GiornoSettimana } from "@prisma/client";

// Story 2.5: unica fonte di verita' per l'ordine e le etichette italiane dei
// GiornoSettimana - review fix: NuovoSlotForm.tsx e page.tsx mantenevano due
// mappe indipendenti con lo stesso contenuto duplicato, senza garanzia che
// restassero sincronizzate tra loro o con l'enum Prisma.
export const GIORNI_SETTIMANA: { value: GiornoSettimana; label: string }[] = [
  { value: "LUNEDI", label: "Lunedì" },
  { value: "MARTEDI", label: "Martedì" },
  { value: "MERCOLEDI", label: "Mercoledì" },
  { value: "GIOVEDI", label: "Giovedì" },
  { value: "VENERDI", label: "Venerdì" },
  { value: "SABATO", label: "Sabato" },
  { value: "DOMENICA", label: "Domenica" },
];

export const ETICHETTA_GIORNO: Record<GiornoSettimana, string> = Object.fromEntries(
  GIORNI_SETTIMANA.map((giorno) => [giorno.value, giorno.label])
) as Record<GiornoSettimana, string>;

const GIORNI_VALIDI_SET = new Set<string>(GIORNI_SETTIMANA.map((g) => g.value));

// Valida un valore non fidato (input form) prima di trattarlo come
// GiornoSettimana - un cast diretto non protegge da dati malformati, stesso
// principio di parseRuoli (lib/ruoli.ts).
export function isGiornoSettimanaValido(value: string): value is GiornoSettimana {
  return GIORNI_VALIDI_SET.has(value);
}

// Story 3.1: mappa l'indice restituito da Date.prototype.getUTCDay()
// (0=Domenica..6=Sabato) a GiornoSettimana. Deliberatamente NON riordina
// GIORNI_SETTIMANA (che resta Lunedi->Domenica per la UI) - questa e' solo
// una tabella di conversione, non una seconda fonte di verita' sull'ordine.
const GIORNO_DA_INDICE_UTC: Record<number, GiornoSettimana> = {
  0: "DOMENICA",
  1: "LUNEDI",
  2: "MARTEDI",
  3: "MERCOLEDI",
  4: "GIOVEDI",
  5: "VENERDI",
  6: "SABATO",
};

// `data` e' una stringa "YYYY-MM-DD" senza componente orario, interpretata
// come UTC mezzanotte dalle specifiche ECMAScript - getUTCDay() (non
// getDay(), che reinterpreta nel fuso orario locale del processo Node) evita
// lo scivolamento di un giorno gia' incontrato con AnnoAgonistico (Story 1.6).
export function giornoSettimanaDaData(data: string): GiornoSettimana {
  return GIORNO_DA_INDICE_UTC[new Date(data).getUTCDay()];
}

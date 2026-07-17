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

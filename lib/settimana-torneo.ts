import type { SettimanaTorneo } from "@prisma/client";

// Story 20.1 (Epic 20, Torneo Memorial): unica fonte di verita' per
// l'ordine e le etichette italiane di SettimanaTorneo - mirror di
// lib/giorno-settimana.ts (GIORNI_SETTIMANA/ETICHETTA_GIORNO/
// isGiornoSettimanaValido), stesso motivo: evitare due mappe indipendenti
// (form di creazione, riga di modifica) che potrebbero disallinearsi tra
// loro o con l'enum Prisma.
export const SETTIMANE_TORNEO: { value: SettimanaTorneo; label: string }[] = [
  { value: "SETTIMANA_1", label: "Settimana 1" },
  { value: "SETTIMANA_2", label: "Settimana 2" },
];

export const ETICHETTA_SETTIMANA: Record<SettimanaTorneo, string> = Object.fromEntries(
  SETTIMANE_TORNEO.map((settimana) => [settimana.value, settimana.label])
) as Record<SettimanaTorneo, string>;

const SETTIMANE_VALIDE_SET = new Set<string>(SETTIMANE_TORNEO.map((s) => s.value));

// Valida un valore non fidato (input form) prima di trattarlo come
// SettimanaTorneo - un cast diretto non protegge da dati malformati, stesso
// principio di isGiornoSettimanaValido (lib/giorno-settimana.ts).
export function isSettimanaTorneoValida(value: string): value is SettimanaTorneo {
  return SETTIMANE_VALIDE_SET.has(value);
}

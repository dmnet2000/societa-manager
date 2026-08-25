import type { GironeTorneo } from "@prisma/client";

// Story 20.2 (Epic 20, Torneo Memorial): unica fonte di verita' per
// l'ordine e le etichette italiane di GironeTorneo - mirror di
// lib/settimana-torneo.ts (SETTIMANE_TORNEO/ETICHETTA_SETTIMANA/
// isSettimanaTorneoValida), stesso motivo: evitare due mappe indipendenti
// (form di creazione, riga di modifica) che potrebbero disallinearsi tra
// loro o con l'enum Prisma.
export const GIRONI_TORNEO: { value: GironeTorneo; label: string }[] = [
  { value: "GIRONE_A", label: "Girone A" },
  { value: "GIRONE_B", label: "Girone B" },
];

export const ETICHETTA_GIRONE: Record<GironeTorneo, string> = Object.fromEntries(
  GIRONI_TORNEO.map((girone) => [girone.value, girone.label])
) as Record<GironeTorneo, string>;

const GIRONI_VALIDI_SET = new Set<string>(GIRONI_TORNEO.map((g) => g.value));

// Valida un valore non fidato (input form) prima di trattarlo come
// GironeTorneo - un cast diretto non protegge da dati malformati, stesso
// principio di isSettimanaTorneoValida (lib/settimana-torneo.ts).
export function isGironeTorneoValido(value: string): value is GironeTorneo {
  return GIRONI_VALIDI_SET.has(value);
}

import type { FaseTorneo } from "@prisma/client";

// Story 20.9 (Epic 20, Torneo Memorial): unica fonte di verita' per l'ordine
// e le etichette italiane di FaseTorneo - mirror di lib/settimana-torneo.ts
// (SETTIMANE_TORNEO/ETICHETTA_SETTIMANA/isSettimanaTorneoValida), stesso
// motivo: evitare due mappe indipendenti (form Nuovo Slot, riga Slot) che
// potrebbero disallinearsi tra loro o con l'enum Prisma (Story 20.4).
export const FASI_TORNEO: { value: FaseTorneo; label: string }[] = [
  { value: "GIRONE", label: "Girone" },
  { value: "SEMIFINALE", label: "Semifinale" },
  { value: "FINALE_VINCENTI", label: "Finale vincenti" },
  { value: "FINALE_PERDENTI", label: "Finale perdenti" },
];

export const ETICHETTA_FASE: Record<FaseTorneo, string> = Object.fromEntries(
  FASI_TORNEO.map((fase) => [fase.value, fase.label])
) as Record<FaseTorneo, string>;

const FASI_VALIDE_SET = new Set<string>(FASI_TORNEO.map((f) => f.value));

// Valida un valore non fidato (input form) prima di trattarlo come
// FaseTorneo - un cast diretto non protegge da dati malformati, stesso
// principio di isSettimanaTorneoValida (lib/settimana-torneo.ts).
export function isFaseTorneoValida(value: string): value is FaseTorneo {
  return FASI_VALIDE_SET.has(value);
}

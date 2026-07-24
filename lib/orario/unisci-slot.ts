import type { GiornoSettimana } from "@/generated/prisma/client";
import { GIORNI_SETTIMANA } from "@/lib/giorno-settimana";

const ORDINE_GIORNO = new Map<GiornoSettimana, number>(
  GIORNI_SETTIMANA.map((giorno, indice) => [giorno.value, indice])
);

type SlotOrdinabile = { id: string; giorno: GiornoSettimana; oraInizio: string };

// Story 2.7: unisce piu' elenchi di Slot (es. quelli risolti via il ramo
// Allenatore e quelli via il ramo Atleta per lo stesso Utente, mio-orario/
// page.tsx) deduplicando per id e riordinando per giorno della settimana
// (ordine di GIORNI_SETTIMANA, non alfabetico) poi ora di inizio. Estratta
// come funzione pura testabile - a differenza della semplice composizione
// di query delle pagine precedenti (Story 2.5/2.6), qui c'e' vera logica
// (dedup + comparator custom) che merita copertura dedicata (review Story 2.7).
export function unisciESordinaSlot<T extends SlotOrdinabile>(
  ...liste: T[][]
): T[] {
  return [...new Map(liste.flat().map((s) => [s.id, s])).values()].sort(
    (a, b) =>
      ORDINE_GIORNO.get(a.giorno)! - ORDINE_GIORNO.get(b.giorno)! ||
      a.oraInizio.localeCompare(b.oraInizio)
  );
}

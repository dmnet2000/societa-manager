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

// Story 20.13 (review fix, Blind Hunter): costante condivisa tra
// aggiornaNomiSettimaneAction (validazione server-side) e
// NomiSettimaneTorneoForm (attributo maxLength) - prima duplicata come
// letterale in entrambi i punti, rischio di drift silenzioso se il limite
// cambiasse in un solo posto. Vive qui (non in actions.ts, "use server") per
// essere importabile anche dal Client Component.
export const NOME_SETTIMANA_MAX = 100;

// Story 20.13 (Epic 20, Torneo Memorial): etichetta mostrata per una
// Settimana, con fallback su ETICHETTA_SETTIMANA (generica) quando l'Edizione
// non ha impostato un nome personalizzato - ETICHETTA_SETTIMANA resta la
// fonte di verita' statica (una costante globale condivisa), renderla
// dinamica per-Edizione ne romperebbe la natura. Una stringa presente ma
// tutta whitespace (es. campo lasciato con soli spazi) conta come "non
// impostata", stesso trattamento di ogni altro campo di testo opzionale del
// progetto (trim prima del controllo di vuotezza).
export function etichettaSettimanaPersonalizzata(
  settimana: SettimanaTorneo,
  edizione: { nomeSettimana1: string | null; nomeSettimana2: string | null }
): string {
  const nomePersonalizzato =
    settimana === "SETTIMANA_1" ? edizione.nomeSettimana1 : edizione.nomeSettimana2;
  const nomeTrim = nomePersonalizzato?.trim();
  return nomeTrim ? nomeTrim : ETICHETTA_SETTIMANA[settimana];
}

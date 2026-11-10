import type { Ruolo } from "@prisma/client";
import { DOMINIO_TABLET } from "@/lib/api-tablet/contratto";

export const RUOLI_VALIDI: Ruolo[] = [
  "ALLENATORE",
  "ATLETA",
  "GENITORE",
  "SEGRETERIA",
  "DIRIGENTE",
  "ADMIN",
  "SITE_MANAGER",
  "DIRETTORE_TECNICO",
  // Referto elettronico (AD-12): utente dedicato a un tablet, esclusivo (mai
  // insieme ad altri Ruoli) e mai ammesso nel sito. Valido come valore qui
  // (app_metadata, elenco Admin), escluso dalla registrazione autonoma e
  // dalle caselle dei Ruoli in /app/admin.
  "TABLET",
];

// Il Ruolo del tablet: esclusivo, creato solo da creaUtenteTablet.
export const RUOLO_TABLET: Ruolo = "TABLET";

// true se l'insieme di Ruoli e' quello di un utente tablet.
export function eUtenteTablet(ruoli: readonly Ruolo[]): boolean {
  return ruoli.includes(RUOLO_TABLET);
}

// true se l'email usa il dominio riservato ai tablet: solo creaUtenteTablet
// puo' creare indirizzi cosi', altrimenti un utente normale occuperebbe il
// nome di un tablet e potrebbe entrare dall'app con quel nome.
export function eEmailTablet(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DOMINIO_TABLET}`);
}

const RUOLI_VALIDI_SET = new Set<string>(RUOLI_VALIDI);

// Valida un valore non fidato (es. app_metadata del JWT, input form) prima di
// trattarlo come Ruolo[] - un cast diretto non protegge da dati malformati.
// Deduplica sempre: un Ruolo ripetuto non ha mai senso per chi chiama.
export function parseRuoli(value: unknown): Ruolo[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const validi = value.filter(
    (v): v is Ruolo => typeof v === "string" && RUOLI_VALIDI_SET.has(v)
  );
  return [...new Set(validi)];
}

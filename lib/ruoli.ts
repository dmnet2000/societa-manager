import type { Ruolo } from "@/generated/prisma/client";

export const RUOLI_VALIDI: Ruolo[] = [
  "ALLENATORE",
  "ATLETA",
  "GENITORE",
  "SEGRETERIA",
  "DIRIGENTE",
  "ADMIN",
];

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

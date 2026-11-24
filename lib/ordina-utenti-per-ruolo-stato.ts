import type { Ruolo } from "@prisma/client";
import { RUOLI_VALIDI } from "./ruoli";

// Story 9.40: priorita' di ordinamento per Ruolo nella tabella Utenti di
// /app/admin - derivata da RUOLI_VALIDI (stesso array condiviso gia' usato
// per l'ordine del gruppo di checkbox in UtenteRow.tsx), non una lista
// separata da tenere manualmente allineata.
const PRIORITA_RUOLO: Record<Ruolo, number> = Object.fromEntries(
  RUOLI_VALIDI.map((ruolo, indice) => [ruolo, indice])
) as Record<Ruolo, number>;

// Valore di ordinamento della colonna "Ruoli" (ElencoUtenti.tsx, ora
// ordinabile dall'intestazione come ogni altra tabella - lib/ordina-tabella.ts).
// Un Utente con piu' Ruoli usa il Ruolo di indice piu' basso (piu'
// prioritario) - confermato con l'utente in Story 9.40. Nessun Ruolo -> null,
// quindi sempre in fondo.
export function prioritaRuoloUtente(ruoli: Ruolo[]): number | null {
  if (ruoli.length === 0) return null;
  return Math.min(...ruoli.map((r) => PRIORITA_RUOLO[r]));
}

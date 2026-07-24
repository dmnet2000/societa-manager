import "server-only";
import type { Ruolo } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";

export type ForbiddenState = { error: { code: "FORBIDDEN"; message: string } };

// Le Server Action non ereditano automaticamente la protezione del route
// guard di proxy.ts (basato sul pathname della pagina) - vanno protette
// anche individualmente. Va chiamata come primo passo in ogni Server Action
// riservata a uno o piu' Ruoli (basta averne uno tra quelli richiesti).
// "FORBIDDEN" e' il code riservato in ARCHITECTURE-SPINE.md esattamente ai
// rifiuti di autorizzazione.
export async function requireRuolo(
  ruoliRichiesti: Ruolo | Ruolo[]
): Promise<ForbiddenState | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Un errore qui (es. Supabase Auth non raggiungibile) va distinto da
  // "nessuna sessione" nei log - altrimenti un'interruzione del servizio e'
  // indistinguibile da un utente non autenticato (review Story 1.3). Il
  // comportamento resta comunque fail-closed in entrambi i casi.
  if (error) {
    console.error(error);
  }

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const richiesti = Array.isArray(ruoliRichiesti)
    ? ruoliRichiesti
    : [ruoliRichiesti];

  if (!richiesti.some((r) => ruoli.includes(r))) {
    return { error: { code: "FORBIDDEN", message: "Non autorizzato." } };
  }

  return null;
}

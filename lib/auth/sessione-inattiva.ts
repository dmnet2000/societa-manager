// Story 9.8: timeout applicativo per inattivita' - le impostazioni native
// Supabase ("Time-box user sessions"/"Inactivity timeout") richiedono il
// piano Pro, in conflitto con NFR6 (nessun budget dedicato, piani Free).
export const SOGLIA_INATTIVITA_MS = 60 * 60 * 1000; // 1 ora, scelta con l'utente
export const ULTIMA_ATTIVITA_COOKIE = "ultima-attivita";

// Funzione pura (nessuna dipendenza da Next.js) cosi' e' testabile in
// isolamento - stesso principio di getRouteDecision (lib/auth/route-guard.ts).
// Assente o malformato -> false (AC #3): un Utente senza tracciamento
// precedente (appena loggato, o gia' loggato prima che questa storia
// esistesse) non va disconnesso immediatamente - il cookie viene scritto per
// la prima volta dal chiamante (middleware.ts), non qui.
export function sessioneScaduta(
  valoreCookie: string | undefined,
  ora: number
): boolean {
  if (!valoreCookie) {
    return false;
  }
  const ultimaAttivita = Number(valoreCookie);
  if (Number.isNaN(ultimaAttivita)) {
    return false;
  }
  return ora - ultimaAttivita > SOGLIA_INATTIVITA_MS;
}

import "server-only";
import { createAdminClient } from "@/lib/auth-admin/client";

// Story 19.9 (Epic 19, Ruolo Site Manager): il Proxy (middleware.ts ->
// lib/auth/route-decision.ts) deve sapere se un pathname sconosciuto
// corrisponde a una PaginaPubblica esistente PRIMA di decidere se
// reindirizzare un Visitatore anonimo a /accedi - senza questo, ogni URL
// nuovo configurato da un Site Manager (Story 19.6-19.8) sarebbe
// login-wallato per un Visitatore non autenticato invece di mostrare il
// contenuto pubblico (AC #1 della storia), esattamente lo stesso bug gia'
// corretto per /squadre,/calendario,/staff,/contatti in Story 18.7 (vedi
// commento su PUBLIC_ROUTES in lib/auth/route-guard.ts) - ma qui lo slug non
// e' noto in anticipo, non puo' essere aggiunto a mano a quell'array
// statico.
//
// Il Proxy gira su runtime edge (vincolo di @opennextjs/cloudflare, vedi
// commento in lib/auth/permessi-configurabili.ts) - Prisma/pg e' impossibile
// li' (richiede net/tls/util Node nativi). Stesso identico pattern di
// rottaAbilitataPerRuolo in permessi-configurabili.ts: lettura via Supabase
// REST (createAdminClient, service-role, compatibile con l'edge) invece di
// Prisma diretto, con una cache in-memory dell'intero set di slug (tabella
// "dépliant digitale", piccola per costruzione - stessa assunzione esplicita
// di quel modulo) e lo stesso TTL 90s.
export const TTL_MS = 90_000;

let cache: { scadeIl: number; slugs: Set<string> } | null = null;

async function leggiSlug(): Promise<Set<string>> {
  const { data, error } = await createAdminClient()
    .from("pagine_pubbliche")
    .select("slug");

  if (error) {
    throw new Error(error.message);
  }

  // Mirror del review fix gia' applicato a permessi-configurabili.ts: una
  // risposta in forma inattesa deve restare diagnosticabile, non lanciare
  // un'eccezione generica indistinguibile da un errore di rete.
  if (!Array.isArray(data)) {
    throw new Error(
      "pagine_pubbliche: risposta inattesa da Supabase REST (data non è un array)"
    );
  }

  return new Set((data as { slug: string }[]).map((r) => r.slug));
}

// "ora" iniettabile per rendere il TTL testabile senza attese reali, stesso
// principio di rottaAbilitataPerRuolo.
export async function paginaPubblicaEsistePerSlug(
  slug: string,
  ora: number = Date.now()
): Promise<boolean> {
  if (!cache || ora >= cache.scadeIl) {
    // Fail-closed: un errore di lettura qui NON deve concedere l'accesso -
    // nega semplicemente questa via d'ingresso opzionale, il comportamento
    // esistente (redirect a /accedi per un Visitatore anonimo su un
    // pathname sconosciuto) resta invariato. La cache resta vuota/invariata
    // cosi' il prossimo tentativo puo' ritentare, stesso pattern di
    // rottaAbilitataPerRuolo.
    try {
      const slugs = await leggiSlug();
      cache = { scadeIl: ora + TTL_MS, slugs };
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  return cache.slugs.has(slug);
}

// Nessun consumer di scrittura ancora in questa storia (Story 19.9 e' solo
// lettura pubblica) - esportata comunque, stesso principio di
// invalidaCachePermessi: la Story 19.10 (creazione/modifica/eliminazione di
// una PaginaPubblica) la chiamera' dopo ogni scrittura riuscita, altrimenti
// una Pagina appena creata resterebbe login-wallata per un Visitatore
// anonimo fino alla scadenza naturale del TTL.
export function invalidaCachePaginePubbliche(): void {
  cache = null;
}

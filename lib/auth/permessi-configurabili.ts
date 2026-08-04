import "server-only";
import type { Ruolo } from "@prisma/client";
import { createAdminClient } from "@/lib/auth-admin/client";

// Story 12.2: cache in-memory con TTL 60-120 secondi (decisione presa con
// l'utente in apertura dell'Epic 12) - 90s e' il punto medio del range.
// Esportata (non solo interna) cosi' il test la importa invece di
// ridichiararla come valore hardcoded indipendente - un domani cambiasse
// qui, il test lo riflette automaticamente invece di andare silenziosamente
// fuori sincrono (review fix, Acceptance Auditor).
export const TTL_MS = 90_000;

// Tabella "permessi_rotte" letta per intero a ogni refresh (non filtrata per
// la singola combinazione richiesta): dimensione oggi limitata al seed di
// Story 12.1 (32 righe, al massimo ~130 con tutte le 26 rotte protette x 5
// Ruoli non-ADMIN) - assunzione esplicita di "tabella piccola", coerente con
// la scala di questo progetto (un solo club). Se in futuro il numero di
// rotte/Ruoli configurabili crescesse di ordini di grandezza, andrebbe
// rivista una lettura filtrata invece di un refresh completo (review fix,
// Blind Hunter).
type CachePermessi = { scadeIl: number; abilitati: Set<string> };

let cache: CachePermessi | null = null;

// Delimitatore "|" sicuro qui: `ruolo` e' l'enum Prisma `Ruolo` (6 valori
// chiusi, mai testo libero), a differenza del bug reale trovato in code
// review di Story 12.1 dove il valore lato ADMIN/rotta manomesso poteva
// contenere "|" extra in un `FormData` non tipizzato. `rotta` e' sempre uno
// dei `prefix` letterali di `PROTECTED_ROUTES` (mai testo libero neanche
// lei), quindi nessuno dei due lati puo' contenere "|" nell'uso reale
// (review fix, Blind Hunter - chiarito qui perche' chi legge questo modulo
// in isolamento non ha altrimenti modo di saperlo).
function chiave(rotta: string, ruolo: Ruolo): string {
  return `${rotta}|${ruolo}`;
}

type RigaPermesso = { rotta: string; ruolo: Ruolo };

// Story 12.4 (fix architetturale, non piu' Prisma diretto): questo modulo e'
// raggiunto anche dal Proxy (middleware.ts -> route-decision.ts), che DEVE
// girare su runtime edge per essere compatibile con Cloudflare (vincolo di
// @opennextjs/cloudflare) - Prisma/pg li' e' impossibile (richiede net/tls/
// util Node nativi, assenti nell'edge: crash confermato dal vivo con
// `next dev`, "Failed to load external module node:util/types", non solo
// teorico). createAdminClient() (@supabase/supabase-js, fetch - compatibile
// con l'edge) risolve il problema. Review fix (Blind Hunter): NON e' lo
// stesso client di middleware.ts - quello usa createServerClient da
// @supabase/ssr (chiave anon, sessione dell'utente via cookie) per
// l'autenticazione, questo usa createAdminClient (chiave service-role,
// nessuna sessione) per bypassare la RLS. Condividono solo la famiglia
// (entrambi fetch-based, compatibili con l'edge), non l'istanza ne' le
// credenziali. Service-role bypassa la RLS ma non i GRANT di base - vedi la
// migrazione dedicata (stesso identico gap gia' incontrato per
// "atlete"/Story 1.5, "configurazione_smtp"/Story 4.3,
// "certificati_medici"/Story 4.x).
async function leggiAbilitati(): Promise<Set<string>> {
  // .eq("abilitato", true) e' un no-op oggi (la Server Action di Story 12.1
  // scrive sempre true, o non scrive affatto la riga - "assenza di riga" e'
  // l'unico meccanismo di "disabilitato" in uso), ma corretto per
  // costruzione se in futuro un flusso diverso scrivesse abilitato:false su
  // una riga esistente invece di cancellarla.
  const { data, error } = await createAdminClient()
    .from("permessi_rotte")
    .select("rotta, ruolo")
    .eq("abilitato", true);

  if (error) {
    throw new Error(error.message);
  }

  // Review fix (Blind Hunter): `data as RigaPermesso[]` senza verifica era
  // un semplice type assertion - se la risposta di PostgREST fosse mai
  // arrivata in una forma inattesa (schema cambiato, stringa .select() con
  // un refuso, versione della libreria diversa), il .map() sottostante
  // avrebbe lanciato un'eccezione generica indistinguibile da un'interruzione
  // di rete nel log di errore. Un controllo esplicito rende la causa
  // diagnosticabile senza cambiare il comportamento fail-closed (l'eccezione
  // e' comunque catturata da rottaAbilitataPerRuolo, che nega l'accesso).
  if (!Array.isArray(data)) {
    throw new Error(
      "permessi_rotte: risposta inattesa da Supabase REST (data non è un array)"
    );
  }

  return new Set((data as RigaPermesso[]).map((r) => chiave(r.rotta, r.ruolo)));
}

// Story 12.2: helper centrale che route-guard.ts e requireRuolo potranno
// consultare (Story 12.3/12.4, nessun collegamento ancora in questa story)
// per sapere se una rotta e' abilitata per un Ruolo. `ora` e' iniettabile
// per rendere il TTL testabile senza attese reali - stesso principio di
// sessioneScaduta(valoreCookie, ora) in lib/auth/sessione-inattiva.ts
// (Story 9.8).
export async function rottaAbilitataPerRuolo(
  rotta: string,
  ruolo: Ruolo,
  ora: number = Date.now()
): Promise<boolean> {
  // AC #1: ADMIN sempre abilitato, hardcoded - nessuna riga di
  // configurazione si applica mai ad ADMIN (Story 12.1), quindi nessuna
  // query va sprecata per il Ruolo che in assoluto la userebbe piu' spesso
  // una volta collegato un consumer reale.
  if (ruolo === "ADMIN") {
    return true;
  }

  if (!cache || ora >= cache.scadeIl) {
    // Review fix (Blind Hunter + Edge Case Hunter, indipendentemente): un
    // errore di lettura (rete, service down) qui si propagherebbe
    // altrimenti non gestito al chiamante - un'eccezione non e' un `false`.
    // Per un modulo che si autodefinisce fail-closed (AC #3), lasciare che
    // un errore di lettura si propaghi rischierebbe di far *fallire aperto*
    // un futuro consumer che non normalizzasse esplicitamente l'eccezione
    // (il contrario esatto della decisione presa con l'utente) - qui invece
    // un errore di lettura nega l'accesso, mai lo concede, e la cache resta
    // vuota/invariata cosi' il prossimo tentativo puo' ritentare.
    try {
      const abilitati = await leggiAbilitati();
      cache = { scadeIl: ora + TTL_MS, abilitati };
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // AC #3: fail-closed - nessuna riga (o riga non abilitato) => negato.
  return cache.abilitati.has(chiave(rotta, ruolo));
}

// Chiamata da requireRuolo (Story 12.4) dopo un salvataggio riuscito da
// salvaPermessiRotte - serve anche per isolare i test tra loro (la cache e'
// stato di modulo condiviso).
//
// Limite noto (review fix, Blind Hunter): in produzione (Cloudflare
// Workers) un modulo viene valutato una volta per isolate - questo azzera
// la cache SOLO dell'isolate che gestisce la richiesta che la chiama, non
// degli altri isolate caldi della flotta, che continueranno a servire
// permessi non aggiornati fino alla scadenza naturale del loro TTL locale
// (fino a TTL_MS). Non e' un'invalidazione immediata garantita a livello di
// flotta, solo un limite superiore probabilistico piu' basso del TTL pieno.
export function invalidaCachePermessi(): void {
  cache = null;
}

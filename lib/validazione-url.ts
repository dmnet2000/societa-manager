import { rottaRiservata } from "@/lib/auth/route-guard";

// Story 19.14 (Epic 19, Ruolo Site Manager): estratto da
// app/app/(configurazione)/menu-pubblico/actions.ts (Story 19.7/19.9), dove
// viveva come funzione privata non esportata. Il blocco Pulsante di questa
// storia deve riusare la STESSA validazione (spec-19-14, Boundaries "Always":
// "nessuna validazione URL nuova da mantenere in parallelo") da
// pagine-pubbliche/actions.ts - ma quel file, come menu-pubblico/actions.ts,
// ha "use server" in testa, e Next.js impone che un modulo "use server"
// possa esportare SOLO funzioni async (ogni export diventa un riferimento a
// Server Action) - una funzione sincrona esportata da li' avrebbe rotto la
// build. Spostata qui (modulo condiviso, nessuna direttiva "use server", solo
// logica pura) - stesso principio di lib/allineamenti.ts/lib/auth/route-guard.ts,
// gia' importati da entrambi i file di azioni senza questo vincolo.
export const LUNGHEZZA_MASSIMA_URL_VOCE_MENU = 200;

// A differenza di linkEsternoValido (sponsor/actions.ts, sempre un URL
// assoluto http/https), qui il valore puo' anche essere una rotta interna
// del sito ("/squadre", stesso formato di app/NavPubblica.tsx) - un
// input type="url" browser rifiuterebbe un valore relativo, per questo il
// campo lato UI resta type="text" e questa e' l'unica validazione reale.
// Review fix: "/" da solo non basta - "//host.esterno" e' un URL
// protocol-relative (il browser/Next Link lo risolve come navigazione
// assoluta verso un altro dominio, non una rotta interna), rifiutato
// esplicitamente qui invece di essere accettato per errore come "rotta
// interna" solo perche' inizia con "/".
// Story 19.9 (Epic 19, Ruolo Site Manager): "&& !rottaRiservata(valore)"
// aggiunto - un Site Manager non deve poter salvare un URL riservato (es.
// "/app", "/api/health", "/accedi") senza alcun avviso.
// Code review (intent_gap, risolto con l'utente 2026-08-20): rottaRiservata()
// riusa isPublicRoute(), che copre anche le pagine pubbliche esistenti - senza
// "urlAttuale" risalvare una voce con lo stesso proprio url (es. solo per
// cambiarne l'etichetta) veniva rifiutato come "riservato". urlAttuale
// (l'url gia' salvato, passato solo in aggiornamento) esenta il caso "url
// invariato" dal controllo - un NUOVO url riservato resta sempre rifiutato.
export function urlVoceMenuValido(valore: string, urlAttuale?: string): boolean {
  if (!valore || valore.length > LUNGHEZZA_MASSIMA_URL_VOCE_MENU) return false;
  if (valore.startsWith("/") && !valore.startsWith("//")) {
    return valore === urlAttuale || !rottaRiservata(valore);
  }
  try {
    const url = new URL(valore);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Story 10.12 (rinegoziazione del 2026-09-28): Worker Cloudflare dedicato e
// minimo, scritto a mano - nessuna dipendenza da Next.js/OpenNext, deploy
// separato dall'app principale (proprio wrangler.jsonc, comando dedicato in
// package.json). Possiede un vero Cron Trigger nativo Cloudflare, cosa che
// il Worker generato da OpenNext non puo' avere (espone solo `fetch`, mai
// `scheduled` - vedi docs/deploy-produzione.md Fase 6). Sostituisce
// .github/workflows/sincronizza-fipav.yml e promemoria-certificati.yml:
// stessa identica logica (fetch con Authorization: Bearer CRON_SECRET verso
// i due endpoint esistenti), ma interamente dentro l'infrastruttura
// Cloudflare - nessuna dipendenza da GitHub Actions, nessun rischio di
// disattivazione automatica dopo 60 giorni di repository inattivo.

interface Env {
  CRON_SECRET: string;
  CRON_ENDPOINT_URL: string;
}

// Tipi minimi locali per l'handler scheduled - evitano di aggiungere
// @cloudflare/workers-types come nuova dipendenza solo per un Worker di
// poche righe (coerente con NFR6, "soluzione piu' semplice", gia' seguito
// ripetutamente in questo progetto).
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

// Due schedule diversi nello stesso Worker (triggers.crons in
// wrangler.jsonc) - event.cron dice quale dei due si e' attivato, cosi' un
// solo Worker copre entrambi i cron invece di uno a testa.
const ENDPOINT_PER_ESPRESSIONE_CRON: Record<string, string> = {
  "*/10 * * * *": "/api/cron/sincronizza-fipav",
  "0 6 * * *": "/api/cron/promemoria-certificati",
};

// Timeout generoso (5 minuti): promemoria-certificati invia una vera email
// SMTP per Certificato in scadenza trovato (mirror del limite gia' scelto
// per .github/workflows/promemoria-certificati.yml prima di questa
// migrazione), sincronizza-fipav elabora un solo Campionato per invocazione
// (mai piu' di ~10s) ma il margine extra non costa nulla per un'invocazione
// schedulata in background, nessun utente in attesa.
const TIMEOUT_MILLISECONDI = 5 * 60 * 1000;

async function chiamaEndpointCron(percorso: string, env: Env): Promise<void> {
  const url = `${env.CRON_ENDPOINT_URL.replace(/\/$/, "")}${percorso}`;
  try {
    const risposta = await fetch(url, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      signal: AbortSignal.timeout(TIMEOUT_MILLISECONDI),
    });
    const corpo = await risposta.text();
    if (!risposta.ok) {
      console.error(`cron-worker: ${percorso} ha risposto ${risposta.status} - ${corpo}`);
      return;
    }
    console.log(`cron-worker: ${percorso} completato - ${corpo}`);
  } catch (err) {
    console.error(`cron-worker: ${percorso} fallito`, err);
  }
}

const worker = {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const percorso = ENDPOINT_PER_ESPRESSIONE_CRON[event.cron];
    if (!percorso) {
      console.error(`cron-worker: nessun endpoint mappato per l'espressione "${event.cron}"`);
      return;
    }
    // ctx.waitUntil: senza, il runtime potrebbe considerare l'invocazione
    // conclusa (e terminare il Worker) prima che il fetch asincrono
    // completi - stesso principio gia' noto per le Durable Object di
    // OpenNext (BucketCachePurge ecc.), qui applicato a un fetch semplice.
    ctx.waitUntil(chiamaEndpointCron(percorso, env));
  },
};

export default worker;

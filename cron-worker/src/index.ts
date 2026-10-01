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

// Richiesta utente 2026-10-01: sincronizzazione FIPAV una volta al giorno
// alle 2:00 ora italiana, 1 minuto di pausa tra un Campionato e l'altro (non
// piu' un battito ogni 10 minuti). I Cron Trigger sono in UTC: le 2:00 di
// Roma sono le 00:00 UTC con l'ora legale e l'01:00 UTC con l'ora solare,
// quindi il trigger scatta in entrambe le ore UTC e il Worker procede solo
// se a Roma sono le 2 (ROMA_ORA_CICLO). I quarti d'ora (2:15/2:30/2:45)
// riprendono il ciclo se non e' finito: un'invocazione ha al massimo 15
// minuti di tempo reale (limite Cloudflare), con 1 minuto di pausa ci
// stanno circa 13 Campionati. Se il ciclo e' gia' finito, la ripresa fa una
// sola chiamata che risponde subito `rimanenti: 0`.
const CRON_SINCRONIZZA_FIPAV = "0,15,30,45 0,1 * * *";
const CRON_PROMEMORIA_CERTIFICATI = "0 6 * * *";
const ROMA_ORA_CICLO = 2;

const PAUSA_TRA_CAMPIONATI_MILLISECONDI = 60 * 1000;
// Margine sotto i 15 minuti di wall time: dopo questo tempo il giro si
// ferma e lascia il resto alla ripresa del quarto d'ora successivo.
const DURATA_MASSIMA_GIRO_MILLISECONDI = 12 * 60 * 1000;
// Finestra all'indietro per `dal`: copre l'intero ciclo notturno (2:00-2:59)
// ma esclude la notte precedente, quindi un Campionato gia' sincronizzato in
// questo ciclo non viene ripreso dalle riprese dei quarti d'ora.
const FINESTRA_CICLO_MILLISECONDI = 2 * 60 * 60 * 1000;

// Timeout generoso (5 minuti) per promemoria-certificati: invia una vera
// email SMTP per Certificato in scadenza trovato (mirror del limite gia'
// scelto per .github/workflows/promemoria-certificati.yml prima di questa
// migrazione).
const TIMEOUT_PROMEMORIA_MILLISECONDI = 5 * 60 * 1000;
// Una sola sincronizzazione di Campionato non supera mai ~10s: 2 minuti di
// margine senza mangiarsi il budget del giro.
const TIMEOUT_SINCRONIZZAZIONE_MILLISECONDI = 2 * 60 * 1000;

const FORMATO_ORA_ROMA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  hour: "numeric",
  hourCycle: "h23",
});

function oraDiRoma(istante: number): number {
  return Number(FORMATO_ORA_ROMA.format(new Date(istante)));
}

function urlEndpoint(percorso: string, env: Env): string {
  return `${env.CRON_ENDPOINT_URL.replace(/\/$/, "")}${percorso}`;
}

// Esegue la chiamata e ne restituisce il corpo JSON, o null su errore di
// rete/HTTP (gia' loggato).
async function chiamaEndpointCron(
  percorso: string,
  env: Env,
  timeout: number
): Promise<Record<string, unknown> | null> {
  try {
    const risposta = await fetch(urlEndpoint(percorso, env), {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      signal: AbortSignal.timeout(timeout),
    });
    const corpo = await risposta.text();
    if (!risposta.ok) {
      console.error(`cron-worker: ${percorso} ha risposto ${risposta.status} - ${corpo}`);
      return null;
    }
    console.log(`cron-worker: ${percorso} completato - ${corpo}`);
    try {
      return JSON.parse(corpo) as Record<string, unknown>;
    } catch {
      return {};
    }
  } catch (err) {
    console.error(`cron-worker: ${percorso} fallito`, err);
    return null;
  }
}

function attendi(millisecondi: number): Promise<void> {
  return new Promise((risolvi) => setTimeout(risolvi, millisecondi));
}

async function sincronizzaFipavNotturna(env: Env, scheduledTime: number): Promise<void> {
  const ora = oraDiRoma(scheduledTime);
  if (ora !== ROMA_ORA_CICLO) {
    console.log(`cron-worker: sincronizza-fipav saltato, a Roma sono le ${ora} (ciclo alle ${ROMA_ORA_CICLO})`);
    return;
  }

  const dal = new Date(scheduledTime - FINESTRA_CICLO_MILLISECONDI).toISOString();
  const escludi: string[] = [];
  const inizio = Date.now();

  for (;;) {
    const parametri = new URLSearchParams({ dal });
    if (escludi.length > 0) parametri.set("escludi", escludi.join(","));
    const corpo = await chiamaEndpointCron(
      `/api/cron/sincronizza-fipav?${parametri}`,
      env,
      TIMEOUT_SINCRONIZZAZIONE_MILLISECONDI
    );

    // Errore di rete/HTTP o niente da fare: il giro finisce qui (un errore
    // viene ritentato alla ripresa del quarto d'ora successivo).
    if (!corpo || corpo.eseguito !== true) return;
    if (corpo.esito === "fallito" && typeof corpo.campionatoId === "string") {
      escludi.push(corpo.campionatoId);
    }
    if (typeof corpo.rimanenti !== "number" || corpo.rimanenti <= 0) return;

    if (Date.now() - inizio + PAUSA_TRA_CAMPIONATI_MILLISECONDI > DURATA_MASSIMA_GIRO_MILLISECONDI) {
      console.log(
        `cron-worker: sincronizza-fipav, ${corpo.rimanenti} Campionati rimandati alla ripresa del quarto d'ora successivo`
      );
      return;
    }
    await attendi(PAUSA_TRA_CAMPIONATI_MILLISECONDI);
  }
}

const worker = {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // ctx.waitUntil: senza, il runtime potrebbe considerare l'invocazione
    // conclusa (e terminare il Worker) prima che il lavoro asincrono
    // completi - stesso principio gia' noto per le Durable Object di
    // OpenNext (BucketCachePurge ecc.), qui applicato a un fetch semplice.
    if (event.cron === CRON_SINCRONIZZA_FIPAV) {
      ctx.waitUntil(sincronizzaFipavNotturna(env, event.scheduledTime));
      return;
    }
    if (event.cron === CRON_PROMEMORIA_CERTIFICATI) {
      ctx.waitUntil(
        chiamaEndpointCron("/api/cron/promemoria-certificati", env, TIMEOUT_PROMEMORIA_MILLISECONDI)
      );
      return;
    }
    console.error(`cron-worker: nessun endpoint mappato per l'espressione "${event.cron}"`);
  },
};

export default worker;

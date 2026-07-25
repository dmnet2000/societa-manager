import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { prisma } from "@/lib/prisma";

// Endpoint di diagnostica pubblico (nessun segreto richiesto, a differenza
// di /api/cron/promemoria-certificati): utile per verificare rapidamente da
// browser se il Worker riesce a raggiungere DB/Supabase Auth, senza dover
// passare dal login e leggere i Cloudflare Workers Logs (introdotto durante
// la diagnosi del problema di bundling Prisma/motore WASM, 2026-07-25 - vedi
// lib/prisma.ts). Le risposte non includono mai dettagli dell'errore che
// potrebbero rivelare credenziali/connection string: solo nome/messaggio
// dell'errore troncato, il dettaglio completo resta nei log server (log()
// sotto, visibile nei Cloudflare Workers Logs).
function log(livello: "info" | "error", messaggio: string, dettaglio?: unknown) {
  if (livello === "error") {
    console.error(`[health] ${messaggio}`, dettaglio ?? "");
  } else {
    console.log(`[health] ${messaggio}`, dettaglio ?? "");
  }
}

async function verificaDatabase() {
  const inizio = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latenzaMs = Date.now() - inizio;
    log("info", "database raggiungibile", { latenzaMs });
    return { stato: "ok" as const, latenzaMs };
  } catch (err) {
    const latenzaMs = Date.now() - inizio;
    log("error", "database non raggiungibile", err);
    const messaggio = err instanceof Error ? err.message : String(err);
    return {
      stato: "errore" as const,
      latenzaMs,
      errore: {
        nome: err instanceof Error ? err.name : "Error",
        // Troncato: i messaggi di errore Prisma possono includere host/porta
        // (non credenziali) - il dettaglio completo va nei log server.
        messaggio: messaggio.slice(0, 200),
      },
    };
  }
}

async function verificaSupabaseAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    return {
      stato: "errore" as const,
      latenzaMs: 0,
      errore: { nome: "ConfigError", messaggio: "NEXT_PUBLIC_SUPABASE_URL non impostata" },
    };
  }
  const inizio = Date.now();
  try {
    // GoTrue richiede sempre l'header "apikey" (anche su /health): senza,
    // risponde 401 - non un'indicazione che il servizio sia irraggiungibile
    // (falso allarme osservato in produzione il 2026-07-25).
    const risposta = await fetch(new URL("/auth/v1/health", url), {
      headers: anonKey ? { apikey: anonKey } : undefined,
      signal: AbortSignal.timeout(5000),
    });
    const latenzaMs = Date.now() - inizio;
    if (!risposta.ok) {
      log("error", "supabase auth ha risposto con errore", { status: risposta.status });
      return {
        stato: "errore" as const,
        latenzaMs,
        errore: { nome: "HttpError", messaggio: `HTTP ${risposta.status}` },
      };
    }
    log("info", "supabase auth raggiungibile", { latenzaMs });
    return { stato: "ok" as const, latenzaMs };
  } catch (err) {
    const latenzaMs = Date.now() - inizio;
    log("error", "supabase auth non raggiungibile", err);
    const messaggio = err instanceof Error ? err.message : String(err);
    return {
      stato: "errore" as const,
      latenzaMs,
      errore: { nome: err instanceof Error ? err.name : "Error", messaggio: messaggio.slice(0, 200) },
    };
  }
}

// Diagnostica 2026-07-25: process.env risultava vuoto per tutte le secret
// nonostante fossero configurate correttamente su Cloudflare (Settings ->
// Variables and Secrets, verificato dal vivo). Confronta process.env (come
// lo popola lib/cloudflare/init.js di @opennextjs/cloudflare, copiando da
// env) con l'`env` grezzo del binding Cloudflare (getCloudflareContext) per
// distinguere due cause diverse: (a) le secret non arrivano affatto al
// Worker, oppure (b) arrivano ma si perdono nel passaggio verso
// process.env (es. non sono stringhe semplici - vedi populateProcessEnv in
// .open-next/cloudflare/init.js, che copia in process.env solo le entry di
// `env` con `typeof valore === "string"").
function verificaVariabiliAmbiente() {
  const richieste = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
  ] as const;

  let envGrezzo: Record<string, unknown> | undefined;
  try {
    envGrezzo = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch (err) {
    log("error", "getCloudflareContext() ha lanciato un'eccezione", err);
  }

  return Object.fromEntries(
    richieste.map((nome) => [
      nome,
      {
        processEnv: Boolean(process.env[nome]),
        cloudflareEnvPresente: envGrezzo ? nome in envGrezzo : "n/d",
        cloudflareEnvTipo: envGrezzo ? typeof envGrezzo[nome] : "n/d",
      },
    ])
  );
}

export async function GET() {
  const [database, supabaseAuth] = await Promise.all([
    verificaDatabase(),
    verificaSupabaseAuth(),
  ]);
  const variabiliAmbiente = verificaVariabiliAmbiente();

  const tutteOk = database.stato === "ok" && supabaseAuth.stato === "ok";

  return NextResponse.json(
    {
      stato: tutteOk ? "ok" : "degradato",
      timestamp: new Date().toISOString(),
      controlli: { database, supabaseAuth },
      variabiliAmbiente,
    },
    { status: tutteOk ? 200 : 503 }
  );
}

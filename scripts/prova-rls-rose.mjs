#!/usr/bin/env node
// Prova della story 3.2 (rose delle squadre) sul progetto Supabase di PROVA.
//
// Entra come due tablet (verifica1 assegnato alla gara scelta, verifica2 no)
// e come anon, poi prova salva_rosa_squadra e le letture PostgREST. Scrive
// sul database solo tramite salva_rosa_squadra (rosa di prova con nomi
// fittizi). Stampa solo id ed esiti, mai nomi, token o password.
//
// Richiede Node >= 22.18 (esegue il .ts del contratto senza compilarlo).
//
// Uso (dalla cartella societa-manager):
//   node scripts/prova-rls-rose.mjs --env ../segreti/supabase-prova.env
//        --tablet-env ../segreti/tablet-verifica.env [--gara 5]
//
// Uscita: 0 tutto come atteso, 1 almeno un controllo fallito, 2 configurazione.

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { leggiEnv } from "./verifica-sicurezza-tablet/logica.mjs";

class ErroreConfigurazione extends Error {}

function argomenti(argv) {
  const opz = { env: undefined, tabletEnv: undefined, gara: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") opz.env = argv[++i];
    else if (a === "--tablet-env") opz.tabletEnv = argv[++i];
    else if (a === "--gara") opz.gara = Number(argv[++i]);
    else throw new ErroreConfigurazione(`Argomento sconosciuto: ${a}`);
  }
  if (!opz.env || !opz.tabletEnv) throw new ErroreConfigurazione("Servono --env e --tablet-env.");
  if (!Number.isInteger(opz.gara)) throw new ErroreConfigurazione("--gara non valido.");
  return opz;
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let fallimenti = 0;
function controlla(descrizione, ok, dettaglio = "") {
  if (!ok) fallimenti++;
  console.log(`${ok ? "OK    " : "FALLITO"} ${descrizione}${dettaglio ? ` (${dettaglio})` : ""}`);
}

async function accedi(url, anon, normalizza, emailDa, nome, password) {
  const c = client(url, anon);
  const nomeNorm = normalizza(nome);
  if (nomeNorm === undefined) throw new ErroreConfigurazione("Nome tablet non valido.");
  const { data, error } = await c.auth.signInWithPassword({ email: emailDa(nomeNorm), password });
  if (error || !data.session) throw new ErroreConfigurazione(`Login fallito per ${nomeNorm}.`);
  return { c, nome: nomeNorm };
}

const GIOCATORI = [
  { numero: 1, nome: "Prova", cognome: "Uno", capitano: true, libero: false },
  { numero: 2, nome: "Prova", cognome: "Due", capitano: false, libero: true },
];
const TESSERATI = [{ ruolo: "A", nome: "Prova Allenatore" }];

async function rpc(c, squadraId, base, idMod, giocatori = GIOCATORI, tesserati = TESSERATI) {
  const { data, error } = await c.rpc("salva_rosa_squadra", {
    squadra_id_param: squadraId,
    versione_base: base,
    id_modifica: idMod,
    giocatori,
    tesserati,
  });
  return { data, errore: error ? `${error.code ?? ""} ${String(error.message).split(":")[0]}`.trim() : null };
}

async function leggi(c, squadraId) {
  const r = await c.from("rose_squadra").select("id, versione").eq("squadraTorneoId", squadraId);
  if (r.error) return { errore: r.error.code ?? "errore", righe: 0, versione: null };
  let giocatori = 0;
  if (r.data.length > 0) {
    const g = await c.from("giocatori_rosa").select("id").eq("rosaId", r.data[0].id);
    if (g.error) return { errore: g.error.code ?? "errore", righe: r.data.length, versione: r.data[0].versione, giocatori: null };
    giocatori = g.data.length;
  }
  return { errore: null, righe: r.data.length, versione: r.data[0]?.versione ?? null, giocatori };
}

async function main() {
  const opz = argomenti(process.argv.slice(2));
  const env = leggiEnv(await readFile(opz.env, "utf8"));
  const tab = leggiEnv(await readFile(opz.tabletEnv, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !env.DIRECT_URL) throw new ErroreConfigurazione("Mancano URL, chiave anon o DIRECT_URL.");

  const { normalizzaNomeTablet, emailDaNomeTablet } = await import("../lib/api-tablet/contratto.ts");

  const t1 = await accedi(url, anon, normalizzaNomeTablet, emailDaNomeTablet, tab.VERIFICA_TABLET_NOME, tab.VERIFICA_TABLET_PASSWORD);
  const t2 = await accedi(url, anon, normalizzaNomeTablet, emailDaNomeTablet, tab.VERIFICA_TABLET2_NOME, tab.VERIFICA_TABLET2_PASSWORD);
  const anonimo = client(url, anon);

  // Squadra: casa della gara scelta, assegnata a verifica1.
  // Come in verifica-sicurezza-tablet.mjs: pg recente tratta sslmode=require
  // come verify-full e rifiuta il certificato del pooler.
  const db = new pg.Client({
    connectionString: env.DIRECT_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  let squadraId;
  try {
    const uid1 = (await t1.c.auth.getUser()).data.user?.id;
    const r = await db.query(
      `SELECT p."squadraCasaId" AS id, u."supabaseAuthId" AS auth
       FROM "partite_torneo" p
       JOIN "assegnazioni_tablet" a ON a."partitaTorneoId" = p."id"
       JOIN "utenti" u ON u."id" = a."utenteId"
       WHERE p."numero" = $1 AND u."supabaseAuthId" = $2`,
      [opz.gara, uid1]
    );
    if (r.rows.length !== 1) throw new ErroreConfigurazione(`Gara ${opz.gara} non trovata o non assegnata al primo tablet (verifica1).`);
    squadraId = r.rows[0].id;
  } finally {
    await db.end();
  }
  console.log(`Squadra ${squadraId} (gara ${opz.gara}), tablet ${t1.nome} e ${t2.nome}`);

  const prima = await leggi(t1.c, squadraId);
  const base = prima.versione ?? 0;
  const id1 = randomUUID();

  const s1 = await rpc(t1.c, squadraId, base, id1);
  controlla("salvataggio come verifica1 -> ok versione base+1", s1.data?.esito === "ok" && s1.data?.versione === base + 1, JSON.stringify(s1.data ?? s1.errore));
  const s2 = await rpc(t1.c, squadraId, base, id1);
  controlla("ripetizione stesso idModifica -> stessa versione", s2.data?.esito === "ok" && s2.data?.versione === base + 1, JSON.stringify(s2.data ?? s2.errore));
  const s3 = await rpc(t1.c, squadraId, base, randomUUID());
  controlla("versione_base superata -> conflitto", s3.data?.esito === "conflitto" && s3.data?.versione === base + 1, JSON.stringify(s3.data ?? s3.errore));
  const l1 = await leggi(t1.c, squadraId);
  controlla("rilettura come verifica1", l1.righe === 1 && l1.versione === base + 1 && l1.giocatori === GIOCATORI.length, `versione ${l1.versione}, giocatori ${l1.giocatori}`);

  const v1 = await rpc(t1.c, squadraId, base + 1, randomUUID(), [GIOCATORI[0], { ...GIOCATORI[1], numero: 1, capitano: false }]);
  controlla("numero doppio -> VALIDATION", v1.errore?.includes("VALIDATION"), v1.errore ?? "");
  const v2 = await rpc(t1.c, squadraId, base + 1, randomUUID(), [GIOCATORI[0], { ...GIOCATORI[1], capitano: true }]);
  controlla("due capitani -> VALIDATION", v2.errore?.includes("VALIDATION"), v2.errore ?? "");
  const l1b = await leggi(t1.c, squadraId);
  controlla("nessuna scrittura dopo i dati non validi", l1b.versione === base + 1 && l1b.giocatori === GIOCATORI.length);

  const l2 = await leggi(t2.c, squadraId);
  controlla("verifica2 (senza la gara) non legge nulla", l2.righe === 0, l2.errore ?? `righe ${l2.righe}`);
  const w2 = await rpc(t2.c, squadraId, base + 1, randomUUID());
  controlla("verifica2 non salva -> FORBIDDEN", w2.errore?.includes("FORBIDDEN"), w2.errore ?? "");

  const la = await leggi(anonimo, squadraId);
  controlla("anon non legge", la.righe === 0 || la.errore !== null, la.errore ?? `righe ${la.righe}`);
  const wa = await rpc(anonimo, squadraId, base + 1, randomUUID());
  controlla("anon non salva", wa.errore !== null, wa.errore ?? "");
  const ins = await t1.c.from("rose_squadra").insert({ id: randomUUID(), squadraTorneoId: squadraId, versione: 99 });
  controlla("scrittura diretta su rose_squadra negata", ins.error !== null, ins.error?.code ?? "");
  const mod = await t1.c.from("modifiche_rosa").select("idModifica");
  controlla("modifiche_rosa non leggibile", mod.error !== null || (mod.data ?? []).length === 0, mod.error?.code ?? "0 righe");

  console.log(fallimenti === 0 ? "Tutto come atteso." : `${fallimenti} controlli falliti.`);
  return fallimenti === 0 ? 0 : 1;
}

main().then(
  (codice) => process.exit(codice),
  (e) => {
    console.error(e instanceof ErroreConfigurazione ? `Configurazione: ${e.message}` : `Errore: ${e.message}`);
    process.exit(e instanceof ErroreConfigurazione ? 2 : 1);
  }
);

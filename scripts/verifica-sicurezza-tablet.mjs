#!/usr/bin/env node
// Verifica di sicurezza dell'API tablet (story 2.8, AD-17) - SOLA LETTURA.
//
// Entra come un tablet e prova a leggere direttamente, con il JWT del tablet
// e con la sola chiave pubblica dell'APK, ogni tabella e vista esposta da
// PostgREST e ogni bucket di Storage (elencati dal database, non a mano).
// Poi confronta GET /api/tablet/v1/gare con le assegnazioni nel database e,
// con --con-disattivazione, verifica che un tablet disattivato dall'operatore
// venga rifiutato.
//
// Uso (dalla cartella societa-manager):
//   node scripts/verifica-sicurezza-tablet.mjs --env <file .env> --api <url del sito>
//        [--con-disattivazione] [--schemi public,altro] [--versione-app N]
//
// --versione-app (default 1) e' l'header X-App-Versione: se l'ambiente ha
// alzato TABLET_APP_VERSIONE_MINIMA, l'API risponde 426 e i controlli
// dell'API lo segnalano come errore di configurazione della verifica.
//
// Dal file .env legge NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// e DIRECT_URL (la service role non serve e non viene letta). Nome e password
// del tablet si chiedono a terminale (password nascosta), oppure da
// VERIFICA_TABLET_NOME / VERIFICA_TABLET_PASSWORD; il secondo tablet di
// --con-disattivazione da VERIFICA_TABLET2_NOME / VERIFICA_TABLET2_PASSWORD.
//
// Scrive solo: login e logout dei tablet. Sul database solo SELECT, in una
// transazione READ ONLY. Mai token, password o righe lette nell'output.
// Uscita: 0 nessuna lettura riuscita, 1 almeno un fallimento, 2 errore di
// configurazione o di login.

import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import {
  citaIdentificatore,
  classificaBucket,
  classificaLettura,
  codiceUscita,
  confrontaGare,
  leggiEnv,
  riepilogo,
} from "./verifica-sicurezza-tablet/logica.mjs";

const NOME_TABLET = /^[a-z][a-z0-9-]{2,29}$/;
const DOMINIO_TABLET = "tablet.invalid";

class ErroreConfigurazione extends Error {}

function argomenti(argv) {
  const opz = { env: undefined, api: undefined, disattivazione: false, schemi: ["public"], versioneApp: "1" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--env") opz.env = argv[++i];
    else if (a === "--api") opz.api = argv[++i];
    else if (a === "--con-disattivazione") opz.disattivazione = true;
    else if (a === "--schemi") opz.schemi = String(argv[++i] ?? "").split(",").filter(Boolean);
    else if (a === "--versione-app") opz.versioneApp = String(argv[++i] ?? "");
    else throw new ErroreConfigurazione(`Argomento sconosciuto: ${a}`);
  }
  if (!opz.env || !opz.api) throw new ErroreConfigurazione("Servono --env <file> e --api <url>.");
  opz.api = opz.api.replace(/\/+$/, "");
  return opz;
}

function domanda(testo, nascosta = false) {
  return new Promise((risolvi) => {
    // Modalita' terminale solo con una tastiera vera: con l'input da un
    // altro programma (pipe) la modalita' terminale non riconosce l'a capo.
    const tastiera = Boolean(process.stdin.isTTY);
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: tastiera });
    if (nascosta && tastiera) {
      // Scrive la domanda una volta sola, poi nessun eco: readline ridisegna
      // la riga (domanda + testo digitato) a ogni Backspace, quindi ogni
      // scrittura successiva va scartata, non filtrata.
      process.stdout.write(testo);
      rl._writeToOutput = () => {};
    }
    rl.question(testo, (risposta) => {
      rl.close();
      if (nascosta) process.stdout.write("\n");
      risolvi(risposta);
    });
  });
}

async function credenziali(prefisso, etichetta) {
  const nome = (process.env[`${prefisso}_NOME`] ?? (await domanda(`Nome del ${etichetta}: `))).trim().toLowerCase();
  if (!NOME_TABLET.test(nome)) throw new ErroreConfigurazione(`Nome tablet non valido: ${nome}`);
  const password = process.env[`${prefisso}_PASSWORD`] ?? (await domanda(`Password di ${nome}: `, true));
  return { nome, email: `${nome}@${DOMINIO_TABLET}`, password };
}

function clientSupabase(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function accedi(supabase, { nome, email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return { ok: false, motivo: error?.message ?? "nessuna sessione", nome };
  return { ok: true, jwt: data.session.access_token, nome };
}

async function leggiJson(risposta) {
  const testo = await risposta.text();
  try {
    return JSON.parse(testo);
  } catch {
    return testo;
  }
}

async function catalogo(db, schemi) {
  const relazioni = (
    await db.query(
      `select n.nspname as schema, c.relname as nome, c.relkind as tipo
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any($1) and c.relkind in ('r','p','v','m')
        order by 1, 2`,
      [schemi]
    )
  ).rows;
  // Un conteggio che fallisce (vista rotta o che scrive) non deve abortire
  // la transazione: savepoint per ognuno, e la voce resta senza conteggio
  // (righe null = non verificabile se l'API risponde []).
  for (const r of relazioni) {
    await db.query("savepoint conta");
    try {
      const conta = await db.query(
        `select count(*)::int as n from ${citaIdentificatore(r.schema)}.${citaIdentificatore(r.nome)}`
      );
      r.righe = conta.rows[0].n;
      await db.query("release savepoint conta");
    } catch {
      await db.query("rollback to savepoint conta");
      r.righe = null;
    }
  }
  const bucket = (
    await db.query(
      `select b.id, b.public as pubblico,
              (select count(*)::int from storage.objects o where o.bucket_id = b.id) as oggetti
         from storage.buckets b order by b.id`
    )
  ).rows;
  const funzioni = (
    await db.query(
      `select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as firma
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = any($1)
          and (has_function_privilege('anon', p.oid, 'EXECUTE')
               or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
        order by 1`,
      [schemi]
    )
  ).rows.map((r) => r.firma);
  return { relazioni, bucket, funzioni };
}

async function garaIdAssegnati(db, email) {
  return (
    await db.query(
      `select a."partitaTorneoId" as id from assegnazioni_tablet a
         join utenti u on u.id = a."utenteId" where u.email = $1`,
      [email]
    )
  ).rows.map((r) => r.id);
}

async function leggiTabella(url, anonKey, bearer, { schema, nome }) {
  const risposta = await fetch(`${url}/rest/v1/${encodeURIComponent(nome)}?select=*&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}`, "Accept-Profile": schema },
  });
  return { status: risposta.status, corpo: await leggiJson(risposta) };
}

async function elencaBucket(url, anonKey, bearer, id) {
  const risposta = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1 }),
  });
  return { status: risposta.status, corpo: await leggiJson(risposta) };
}

async function chiamaGare(api, jwt, versioneApp) {
  const risposta = await fetch(`${api}/api/tablet/v1/gare`, {
    headers: { Authorization: `Bearer ${jwt}`, "X-App-Versione": versioneApp },
  });
  return { status: risposta.status, corpo: await leggiJson(risposta) };
}

function dettaglioApi(status) {
  return status === 426
    ? "HTTP 426 APP_OBSOLETA: rilancia con --versione-app uguale al minimo dell'ambiente"
    : `HTTP ${status}`;
}

async function main() {
  const opz = argomenti(process.argv.slice(2));
  const env = leggiEnv(await readFile(opz.env, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const directUrl = env.DIRECT_URL;
  for (const [chiave, valore] of [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["DIRECT_URL", directUrl],
  ]) {
    if (!valore) throw new ErroreConfigurazione(`Manca ${chiave} in ${opz.env}.`);
  }
  console.log(`Ambiente: ${new URL(url).host}  API: ${opz.api}`);

  const tablet = await credenziali("VERIFICA_TABLET", "tablet da verificare");
  const supabase = clientSupabase(url, anonKey);
  const login = await accedi(supabase, tablet);
  if (!login.ok) throw new ErroreConfigurazione(`Login di ${tablet.nome} rifiutato: ${login.motivo}`);

  /** @type {import("./verifica-sicurezza-tablet/logica.mjs").Controllo[]} */
  const controlli = [];
  let funzioni = [];
  // Da qui in poi il tablet ha una sessione aperta: qualunque errore viene
  // registrato come controllo fallito, il riepilogo si stampa comunque e la
  // sessione si chiude nel finally.
  try {
    funzioni = await verificaLetture({ opz, url, anonKey, directUrl, tablet, jwt: login.jwt, controlli });
    if (opz.disattivazione) await verificaDisattivazione({ opz, url, anonKey, controlli });
  } catch (errore) {
    controlli.push({
      voce: "verifica interrotta",
      chi: "-",
      esito: "fallita",
      dettaglio: errore instanceof Error ? errore.message : String(errore),
    });
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
  console.log("");
  console.log(riepilogo(controlli, funzioni));
  return codiceUscita(controlli);
}

async function verificaLetture({ opz, url, anonKey, directUrl, tablet, jwt, controlli }) {
  // pg recente tratta sslmode=require come verify-full e rifiuta il
  // certificato del pooler: si toglie dall'URL e si usa TLS senza verifica
  // della catena (sola lettura, nessun segreto inviato oltre a quelli del .env).
  const db = new pg.Client({
    connectionString: directUrl.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    await db.query("begin transaction read only");
    const cat = await catalogo(db, opz.schemi);
    console.log(`Tabelle e viste: ${cat.relazioni.length}  Bucket: ${cat.bucket.length}`);

    for (const [chi, bearer] of [
      ["tablet", jwt],
      ["anon", anonKey],
    ]) {
      for (const r of cat.relazioni) {
        const lettura = await leggiTabella(url, anonKey, bearer, r);
        const esito = classificaLettura({ ...lettura, righeNelDb: r.righe ?? 0 });
        controlli.push({
          voce: `${r.schema}.${r.nome}`,
          chi,
          esito,
          dettaglio:
            esito === "non-verificabile"
              ? `HTTP ${lettura.status}, righe nel DB ${r.righe ?? "non contabili"}`
              : undefined,
        });
      }
      for (const b of cat.bucket) {
        const lettura = await elencaBucket(url, anonKey, bearer, b.id);
        const esito = classificaBucket({ ...lettura, oggettiNelDb: b.oggetti });
        controlli.push({
          voce: `storage.${b.id}`,
          chi,
          esito,
          dettaglio:
            esito === "letta" && b.pubblico
              ? "bucket marcato pubblico: l'elenco dei file e' comunque aperto"
              : esito === "non-verificabile"
                ? `HTTP ${lettura.status}, oggetti ${b.oggetti}`
                : undefined,
        });
      }
    }

    const gare = await chiamaGare(opz.api, jwt, opz.versioneApp);
    const attese = await garaIdAssegnati(db, tablet.email);
    if (gare.status !== 200 || !Array.isArray(gare.corpo?.gare)) {
      controlli.push({ voce: "api gare", chi: tablet.nome, esito: "fallita", dettaglio: dettaglioApi(gare.status) });
    } else {
      const confronto = confrontaGare(
        gare.corpo.gare.map((g) => g.garaId),
        attese
      );
      controlli.push({
        voce: "api gare = assegnazioni",
        chi: tablet.nome,
        esito: confronto.ok ? "ok" : "fallita",
        dettaglio: confronto.ok
          ? `${attese.length} gare`
          : `in piu' ${confronto.inPiu.join(",") || "-"}; mancanti ${confronto.mancanti.join(",") || "-"}`,
      });
    }
    await db.query("rollback");
    return cat.funzioni;
  } finally {
    await db.end();
  }
}

async function verificaDisattivazione({ opz, url, anonKey, controlli }) {
  const secondo = await credenziali("VERIFICA_TABLET2", "tablet da disattivare");
  const supabase2 = clientSupabase(url, anonKey);
  const login2 = await accedi(supabase2, secondo);
  if (!login2.ok) {
    controlli.push({
      voce: "disattivazione",
      chi: secondo.nome,
      esito: "fallita",
      dettaglio: `login iniziale rifiutato (${login2.motivo}): controllo non eseguito`,
    });
    return;
  }
  try {
    const prima = await chiamaGare(opz.api, login2.jwt, opz.versioneApp);
    controlli.push({
      voce: "disattivazione: prima",
      chi: secondo.nome,
      esito: prima.status === 200 ? "ok" : "fallita",
      dettaglio: dettaglioApi(prima.status),
    });
    await domanda(`
Ora disattiva "${secondo.nome}" dal sito (Amministrazione > Disattiva), poi premi Invio... `);
    const dopo = await chiamaGare(opz.api, login2.jwt, opz.versioneApp);
    controlli.push({
      voce: "disattivazione: token di prima",
      chi: secondo.nome,
      esito: dopo.status === 401 ? "ok" : "fallita",
      dettaglio: dettaglioApi(dopo.status),
    });
    const supabase3 = clientSupabase(url, anonKey);
    const nuovo = await accedi(supabase3, secondo);
    controlli.push({
      voce: "disattivazione: nuovo login",
      chi: secondo.nome,
      esito: nuovo.ok ? "fallita" : "ok",
      dettaglio: nuovo.ok ? "login riuscito" : "login rifiutato",
    });
    if (nuovo.ok) await supabase3.auth.signOut().catch(() => {});
    console.log(`Ricorda di riattivare "${secondo.nome}" dal sito se ti serve ancora.`);
  } finally {
    // Dopo il ban la sessione e' gia' revocata: il logout e' solo pulizia.
    await supabase2.auth.signOut().catch(() => {});
  }
}

// Uscita esplicita, ma solo dopo che il terminale ha ricevuto tutto: su
// Windows le scritture sono asincrone (un process.exit immediato puo'
// troncare il riepilogo) e senza uscita esplicita lo stdin aperto dalle
// domande e le connessioni HTTP in keep-alive tengono vivo il processo.
function esci(codice) {
  process.stdout.write("", () => process.exit(codice));
}

main().then(esci, (errore) => {
  console.error(errore instanceof ErroreConfigurazione ? `ERRORE: ${errore.message}` : errore);
  esci(2);
});

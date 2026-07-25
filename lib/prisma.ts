// Import da "./prisma-engine-wasm" (shim locale), non da "@prisma/client"
// direttamente: "@prisma/client" risolve al motore nativo o WASM a seconda
// di QUALE fase di bundling risolve per prima la condizione di export "."
// ("workerd" vs "node") - in pratica il build Cloudflare (Next.js/Turbopack
// prima, poi l'esbuild interno di @opennextjs/cloudflare) finiva sempre per
// scegliere il motore nativo (richiede un binario OpenSSL specifico del
// sistema operativo, impossibile da eseguire dentro un Worker: nessuna
// esecuzione di codice nativo in un isolate V8). Lo shim forza in modo
// incondizionato il subpath "@prisma/client/wasm" (motore WASM, l'unico
// eseguibile in un Worker) tramite require() in un file .js separato - un
// require() nello stesso file .ts rompeva l'inferenza dei tipi generati da
// Prisma in file non correlati (causa non identificata, probabilmente un
// limite del checker di Next.js/Turbopack nel propagare gli overload
// generati quando il valore passa da un cast anziche' da un import diretto).
// Verificato in locale (2026-07-25) ispezionando l'output di
// `npx opennextjs-cloudflare build`: senza questo shim il bundle finale
// conteneva `config.engineWasm = undefined` (motore nativo, causa di
// PrismaClientInitializationError "could not locate the Query Engine for
// runtime debian-openssl-x.x.x" in produzione); con lo shim contiene
// `config.engineWasm = {...}` (motore WASM).
import { cache } from "react";
import { PrismaClient } from "./prisma-engine-wasm";
import { PrismaPg } from "@prisma/adapter-pg";

// AD-3 / AD-9: Prisma via driver adapter (obbligatorio in Prisma 7), connesso
// al pooler Supavisor (DATABASE_URL, transaction pooler) a runtime — non alla
// connessione diretta, che e' riservata al CLI (vedi prisma.config.ts).
//
// React.cache() invece di un singleton a livello di modulo (usato prima
// del 2026-07-25): su Cloudflare Workers un modulo viene valutato una sola
// volta per isolate, non per richiesta - un isolate "caldo" gestisce piu'
// richieste riusando lo stesso modulo, quindi un semplice
// `export const prisma = new PrismaClient(...)` riusava lo stesso pool
// pg/PrismaClient (e il socket TCP sottostante di @prisma/adapter-pg) tra
// richieste HTTP diverse. workerd non garantisce che un I/O aperto durante
// una richiesta resti valido/utilizzabile in un'altra - osservato in
// produzione come richieste bloccate in modo intermittente ("The Workers
// runtime canceled this request because it detected that your Worker's
// code had hung"), "risolte" da un reload solo perche' capitava di finire
// su un isolate nuovo. cache() (Request Memoization di Next.js, non solo
// deduplicazione React) crea un'istanza fresca per ogni richiesta,
// condivisa pero' fra le chiamate multiple a `prisma` DENTRO la stessa
// richiesta - nessun costo aggiuntivo rispetto a prima in quel caso.
const getPrismaClient = cache(() => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
});

// Proxy invece di esportare direttamente la funzione: i ~30 file che
// importano `{ prisma }` continuano a scrivere `prisma.utente.findUnique(...)`
// invariato - ogni accesso a una proprieta' risolve al client della
// richiesta CORRENTE tramite getPrismaClient() sopra.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});

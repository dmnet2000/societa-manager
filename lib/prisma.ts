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
import { PrismaClient } from "./prisma-engine-wasm";
import { PrismaPg } from "@prisma/adapter-pg";

// AD-3 / AD-9: Prisma via driver adapter (obbligatorio in Prisma 7), connesso
// al pooler Supavisor (DATABASE_URL, transaction pooler) a runtime — non alla
// connessione diretta, che e' riservata al CLI (vedi prisma.config.ts).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

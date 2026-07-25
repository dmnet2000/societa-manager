import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// AD-3: Prisma e' il modello dati canonico. Il CLI (migrate, studio, ecc.)
// usa sempre la connessione diretta (DIRECT_URL), non il pooler — il pooler
// in transaction mode non supporta i prepared statement richiesti da Migrate.
//
// "engine: 'classic'" e' OBBLIGATORIO insieme a "datasource" (tipo union
// SchemaEngineConfigClassic in @prisma/config) - senza, TypeScript non lo
// segnala (excess-property check troppo permissivo sulle union, "datasource"
// e' comunque una chiave nota in un membro dell'union) ma "datasource.url"
// viene IGNORATO IN SILENZIO dal CLI, che ripiega sul blocco
// datasource/DATABASE_URL di schema.prisma. Bug scoperto il 2026-07-25
// verificando con una variabile marcatore che `prisma migrate status`
// ignorava DIRECT_URL e usava sempre DATABASE_URL (127.0.0.1 in locale) -
// nessun deploy precedente aveva davvero mai usato DIRECT_URL per il CLI.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  engine: "classic",
  datasource: {
    url: env("DIRECT_URL"),
  },
});

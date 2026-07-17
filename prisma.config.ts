import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// AD-3: Prisma e' il modello dati canonico. Il CLI (migrate, studio, ecc.)
// usa sempre la connessione diretta (DIRECT_URL), non il pooler — il pooler
// in transaction mode non supporta i prepared statement richiesti da Migrate.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});

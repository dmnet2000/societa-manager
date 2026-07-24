import { PrismaClient } from "@prisma/client";
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

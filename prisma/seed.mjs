// Seed di primo accesso per sviluppo locale: crea un utente Admin
// (email/password fissi, SOLO per uso locale — non eseguire contro un
// progetto Supabase di produzione).
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "admin@societa-manager.local";
const ADMIN_PASSWORD = "password";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono richiesti (vedi .env, valori stampati da `supabase start`)."
    );
  }

  // Guardia di sicurezza: questo script crea un Admin con password nota e
  // fissa - va eseguito solo contro un'istanza Supabase locale, mai contro
  // un progetto cloud/staging/produzione.
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(supabaseUrl)) {
    throw new Error(
      `Rifiutata l'esecuzione del seed: NEXT_PUBLIC_SUPABASE_URL ("${supabaseUrl}") non punta a un'istanza Supabase locale (127.0.0.1/localhost). Questo script crea un Admin con password nota, va eseguito solo in locale.`
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { ruoli: ["ADMIN"] },
  });

  if (error) {
    throw new Error(`Creazione utente Admin fallita: ${error.message}`);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  await prisma.utente.create({
    data: {
      supabaseAuthId: data.user.id,
      email: ADMIN_EMAIL,
      ruoli: { create: [{ ruolo: "ADMIN" }] },
    },
  });

  await prisma.$disconnect();

  console.log(
    `Utente Admin di primo accesso creato: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

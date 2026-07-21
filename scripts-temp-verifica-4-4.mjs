import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EMAIL = "verifica44-atleta@example.com";
const PASSWORD = "verifica44pass";
const CF = "VRF44A01A001B";

async function main() {
  const atleta = await prisma.atleta.create({
    data: {
      id: randomUUID(),
      codiceFiscale: CF,
      nome: "Verifica Storia 44",
      sesso: "F",
      dataNascita: new Date("2010-01-01"),
    },
  });
  console.log("atletaId=" + atleta.id);

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { ruoli: ["ATLETA"] },
  });
  if (error) throw new Error("createUser: " + error.message);

  const utente = await prisma.utente.create({
    data: {
      supabaseAuthId: data.user.id,
      email: EMAIL,
      ruoli: { create: [{ ruolo: "ATLETA" }] },
    },
  });
  console.log("utenteId=" + utente.id);

  await prisma.genitoreAtleta.create({
    data: {
      utenteId: utente.id,
      atletaId: atleta.id,
      autoAggancio: true,
    },
  });

  console.log("OK: email=" + EMAIL + " password=" + PASSWORD + " atletaId=" + atleta.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

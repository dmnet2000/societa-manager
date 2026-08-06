import "server-only";
import { prisma } from "@/lib/prisma";

// Riga singola su id fisso (stesso principio di ID_CONFIGURAZIONE_SMTP,
// lib/db-rls/configurazione-smtp.ts) - un upsert atomico su questo id
// invece di un read-then-branch, evita la stessa race condition gia'
// documentata li'. NON protetta da RLS (vedi commento sul model in
// prisma/schema.prisma): letta anche da /accedi, prima dell'autenticazione.
export const ID_CONFIGURAZIONE_APPLICAZIONE =
  "00000000-0000-0000-0000-000000000001";

export async function leggiNomeSettore(): Promise<string | null> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { nomeSettore: true },
  });
  return configurazione?.nomeSettore ?? null;
}

export async function salvaNomeSettore(nomeSettore: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore },
    update: { nomeSettore },
  });
}

// Story 9.31: mirror esatto di leggiNomeSettore/salvaNomeSettore sopra -
// destinatario unico dell'email di notifica upload Certificato Medico
// (Story 4.3), sostituisce la derivazione precedente da ogni Utente con
// Ruolo Segreteria.
export async function leggiEmailSegreteria(): Promise<string | null> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { emailSegreteria: true },
  });
  return configurazione?.emailSegreteria ?? null;
}

export async function salvaEmailSegreteria(email: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: email },
    update: { emailSegreteria: email },
  });
}

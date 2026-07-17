import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DatiCertificato = {
  dataInizioValidita: Date | null;
  dataFineValidita: Date;
  mesiValidita: number | null;
  modulo: string | null;
};

function serializza(dati: DatiCertificato) {
  return {
    dataInizioValidita: dati.dataInizioValidita?.toISOString() ?? null,
    dataFineValidita: dati.dataFineValidita.toISOString(),
    mesiValidita: dati.mesiValidita,
    modulo: dati.modulo,
  };
}

// AD-4/AD-9: CertificatoMedico e' protetta da RLS - il client Supabase
// passato deve avere la sessione dell'utente autenticato (mai Prisma
// diretto a runtime), stesso pattern di lib/db-rls/atleta.ts (Story 1.3).
export async function trovaCertificatoPerAtleta(
  supabase: SupabaseClient,
  atletaId: string
) {
  const { data, error } = await supabase
    .from("certificati_medici")
    .select("*")
    .eq("atletaId", atletaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// `id`/`updatedAt` generati esplicitamente: i default Prisma
// (@default(uuid()), @updatedAt) sono lato Prisma Client, non colonne con
// default a livello Postgres - non si applicano quando si scrive tramite
// supabase-js (stessa lezione di Story 1.3).
export async function creaCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  dati: DatiCertificato
): Promise<void> {
  const { error } = await supabase.from("certificati_medici").insert({
    id: randomUUID(),
    atletaId,
    ...serializza(dati),
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function aggiornaCertificato(
  supabase: SupabaseClient,
  id: string,
  dati: DatiCertificato
): Promise<void> {
  // .select() dopo l'update per rilevare un aggiornamento che non ha
  // toccato nessuna riga (id inesistente o negato dalla RLS) - stesso
  // controllo introdotto in aggiornaAtleta (Story 1.3 review).
  const { data, error } = await supabase
    .from("certificati_medici")
    .update({
      ...serializza(dati),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Nessuna riga aggiornata per il Certificato ${id} (non trovato o non autorizzato).`
    );
  }
}

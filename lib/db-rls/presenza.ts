import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RigaPresenza = {
  atletaId: string;
  slotId: string;
  data: string;
  presente: boolean;
};

export type PresenzaRegistrata = { atletaId: string; presente: boolean };

// AD-4/AD-9: Presenza e' protetta da RLS - il client Supabase passato deve
// avere la sessione dell'utente autenticato (mai Prisma diretto a runtime),
// stesso pattern di lib/db-rls/iscrizione.ts.
//
// Primo utilizzo di .upsert() via supabase-js in questa codebase (Dev Notes
// Story 3.1): PostgREST genera un ON CONFLICT DO UPDATE SET su tutte le
// colonne del payload, incluso "id" - un id generato lato client viene quindi
// riscritto ad ogni ri-registrazione della stessa combinazione
// atletaId+slotId+data (AC #3). Accettato deliberatamente: nessuna FK punta
// a Presenza.id, questo "churn" della chiave primaria e' innocuo - non
// introdurre un DEFAULT Postgres one-off solo per questa tabella.
//
// Un tentativo di registrare per uno Slot di un Gruppo altrui (AC #4) viene
// rifiutato dalla policy RLS "allenatore_proprio_gruppo_insert"/"_update" -
// l'upsert fallisce con un errore Postgres esplicito, propagato qui, non un
// successo silenzioso parziale.
export async function registraPresenze(
  supabase: SupabaseClient,
  righe: RigaPresenza[]
): Promise<void> {
  const { error } = await supabase.from("presenze").upsert(
    righe.map((riga) => ({ id: randomUUID(), ...riga })),
    { onConflict: "atletaId,slotId,data" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

// Precompila i checkbox del form con le presenze gia' registrate per questo
// Slot+data (AC #3: correggere presenze esistenti, non solo crearne di nuove).
export async function leggiPresenzePerSlotEData(
  supabase: SupabaseClient,
  slotId: string,
  data: string
): Promise<PresenzaRegistrata[]> {
  const { data: righe, error } = await supabase
    .from("presenze")
    .select("atletaId, presente")
    .eq("slotId", slotId)
    .eq("data", data);

  if (error) {
    throw new Error(error.message);
  }

  return righe ?? [];
}

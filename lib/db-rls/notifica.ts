import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// AD-4/AD-9: Notifica e' protetta da RLS (Story 4.2) - il client Supabase
// passato deve avere la sessione dell'utente autenticato. `id` va generato
// qui esplicitamente: @default(uuid()) e' lato Prisma Client, non una
// colonna con default a livello Postgres (stesso motivo di ogni altra
// tabella di questo progetto). `createdAt` NON va nel payload: ha
// `DEFAULT CURRENT_TIMESTAMP` a livello Postgres (unico caso in questo
// schema con un default DB-side per una colonna diversa da un id).
export async function creaNotifica(
  supabase: SupabaseClient,
  atletaId: string
): Promise<void> {
  const { error } = await supabase.from("notifiche").insert({
    id: randomUUID(),
    atletaId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type NotificaElenco = {
  id: string;
  atletaId: string;
  createdAt: string;
};

// RLS decide cosa e' visibile (Allenatore: proprio Gruppo; Dirigente:
// ampio) - nessun filtro applicativo aggiuntivo, stesso principio di
// elencaAtlete.
export async function elencaNotifiche(
  supabase: SupabaseClient
): Promise<NotificaElenco[]> {
  const { data, error } = await supabase
    .from("notifiche")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

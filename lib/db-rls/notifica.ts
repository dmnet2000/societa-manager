import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoNotifica } from "@prisma/client";

// AD-4/AD-9: Notifica e' protetta da RLS (Story 4.2) - il client Supabase
// passato deve avere la sessione dell'utente autenticato. `id` va generato
// qui esplicitamente: @default(uuid()) e' lato Prisma Client, non una
// colonna con default a livello Postgres (stesso motivo di ogni altra
// tabella di questo progetto). `createdAt` NON va nel payload: ha
// `DEFAULT CURRENT_TIMESTAMP` a livello Postgres (unico caso in questo
// schema con un default DB-side per una colonna diversa da un id).
// Story 9.18: terzo parametro opzionale con default - il chiamante
// esistente (certificato-medico/actions.ts, Story 4.2) continua a
// compilare invariato, senza passare `tipo`.
export async function creaNotifica(
  supabase: SupabaseClient,
  atletaId: string,
  tipo: TipoNotifica = "CERTIFICATO_CARICATO"
): Promise<void> {
  const { error } = await supabase.from("notifiche").insert({
    id: randomUUID(),
    atletaId,
    tipo,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type NotificaElenco = {
  id: string;
  atletaId: string;
  tipo: TipoNotifica;
  createdAt: string;
};

// RLS decide cosa e' visibile (Allenatore: proprio Gruppo; Dirigente:
// ampio) - nessun filtro applicativo aggiuntivo, stesso principio di
// elencaAtlete. Review fix: colonne esplicite (mai select("*"), stesso
// principio di elencaAtlete) e limite a 50 righe - la tabella cresce senza
// limite (nessuna deduplicazione/stato "letta", scelta deliberata di questa
// storia, vedi Dev Notes), un tetto ragionevole evita che la lista rallenti
// indefinitamente.
export async function elencaNotifiche(
  supabase: SupabaseClient
): Promise<NotificaElenco[]> {
  const { data, error } = await supabase
    .from("notifiche")
    .select("id, atletaId, tipo, createdAt")
    .order("createdAt", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

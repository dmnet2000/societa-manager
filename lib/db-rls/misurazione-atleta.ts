import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DatiMisurazione = {
  tipo: string;
  valore: number;
  unitaMisura: string;
  data: string;
};

export type Misurazione = {
  id: string;
  tipo: string;
  valore: number;
  unitaMisura: string;
  data: string;
};

// Story 6.1 (FR-24): MisurazioneAtleta e' protetta da RLS - il client
// Supabase passato deve avere la sessione dell'utente autenticato (mai
// Prisma diretto a runtime), stesso pattern di lib/db-rls/presenza.ts.
// `id` generato esplicitamente: il default Prisma (@default(uuid())) e'
// lato Prisma Client, non una colonna con default a livello Postgres - non
// si applica quando si scrive tramite supabase-js (stessa lezione di ogni
// altra tabella di questo progetto). Log append-only: nessun update/delete,
// nessun AC lo richiede.
export async function inserisciMisurazione(
  supabase: SupabaseClient,
  atletaId: string,
  dati: DatiMisurazione
): Promise<void> {
  const { error } = await supabase.from("misurazioni_atleta").insert({
    id: randomUUID(),
    atletaId,
    ...dati,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// AC #2: elenco cronologico (dal piu' vecchio al piu' recente) - RLS
// restringe autonomamente le righe visibili a seconda del Ruolo del
// chiamante (Allenatore: proprie Atlete; Atleta: se stessa) - nessun filtro
// aggiuntivo va applicato qui. Secondo `.order("id")` come spareggio
// deterministico (stesso principio di leggiStoricoPresenzePerAtleta, Story
// 3.2 review fix): `data` non e' univoca da sola (piu' misurazioni possono
// cadere nello stesso giorno).
export async function leggiMisurazioniPerAtleta(
  supabase: SupabaseClient,
  atletaId: string
): Promise<Misurazione[]> {
  const { data: righe, error } = await supabase
    .from("misurazioni_atleta")
    .select("id, tipo, valore, unitaMisura, data")
    .eq("atletaId", atletaId)
    .order("data", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return righe ?? [];
}

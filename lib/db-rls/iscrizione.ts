import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type IscrizioneElenco = { id: string; atletaId: string };

// AD-4/AD-9: Iscrizione e' protetta da RLS - il client Supabase passato
// deve avere la sessione dell'utente autenticato (mai Prisma diretto a
// runtime), stesso pattern di lib/db-rls/atleta.ts (Story 1.3).
// Story 1.8: filtra attiva=true - un'Iscrizione esclusa manualmente non
// deve piu' risultare "iscritta" ne' per la pagina di conferma ne' per il
// riporto Under 13 dell'anno successivo (AC #2). Restituisce anche l'id
// della riga (non solo l'atletaId): serve alla pagina di conferma per
// chiamare escludiIscrizione (AC #4).
export async function elencaIscrizioniPerAnno(
  supabase: SupabaseClient,
  annoAgonisticoId: string
): Promise<IscrizioneElenco[]> {
  const { data, error } = await supabase
    .from("iscrizioni")
    .select("id, atletaId")
    .eq("annoAgonisticoId", annoAgonisticoId)
    .eq("attiva", true);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// AC #4: idempotente - se l'Atleta e' gia' iscritta per questo Anno
// Agonistico, l'INSERT viola @@unique([atletaId, annoAgonisticoId])
// (Postgres 23505): invece di propagare l'errore (check-then-insert
// lascerebbe una finestra di race, stessa classe di problema gia' nota da
// Story 1.3/1.4), si riattiva la riga se era stata esclusa (Story 1.8
// review fix: senza questo passo, un'Iscrizione esclusa non potrebbe mai
// piu' essere ri-creata per lo stesso Atleta/Anno Agonistico - ne' da una
// nuova conferma manuale ne' da un futuro riporto automatico - un vicolo
// cieco permanente). Restituisce true se e' stata creata/riattivata una
// riga attiva, false se la riga esistente era gia' attiva (vero no-op).
export async function inserisciIscrizione(
  supabase: SupabaseClient,
  atletaId: string,
  annoAgonisticoId: string
): Promise<boolean> {
  const { error } = await supabase.from("iscrizioni").insert({
    id: randomUUID(),
    atletaId,
    annoAgonisticoId,
  });

  if (!error) {
    return true;
  }

  if (error.code !== "23505") {
    throw new Error(error.message);
  }

  const { data, error: updateError } = await supabase
    .from("iscrizioni")
    .update({ attiva: true })
    .eq("atletaId", atletaId)
    .eq("annoAgonisticoId", annoAgonisticoId)
    .eq("attiva", false)
    .select();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return !!data && data.length > 0;
}

// Story 1.8 AC #4: esclusione manuale - UPDATE, non DELETE (Story 1.6 ha
// deliberatamente rimosso ogni policy/GRANT DELETE su "iscrizioni"). Stesso
// controllo "riga effettivamente modificata" gia' usato in
// aggiornaAtleta/aggiornaCertificato.
export async function disattivaIscrizione(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { data, error } = await supabase
    .from("iscrizioni")
    .update({ attiva: false })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Nessuna riga aggiornata per l'Iscrizione ${id} (non trovata o non autorizzata).`
    );
  }
}

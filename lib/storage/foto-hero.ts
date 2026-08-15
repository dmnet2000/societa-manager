import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "foto-hero";
const PATH = "foto-hero";

// Story 18.14: mirror esatto di lib/storage/logo.ts - bucket Storage
// pubblico, path fisso (singleton a livello di sito, nessun campo Prisma).
// upsert: true sostituisce fisicamente il file precedente (AC #1: "sostituisce
// quella precedente se già presente"). contentType esplicito necessario:
// senza cartella/estensione nel path, il tipo servito dipende dal metadato
// salvato al momento dell'upload, non dal nome del file.
export async function caricaFotoHero(
  supabase: SupabaseClient,
  file: File
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PATH, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
}

// Deterministico, nessuna chiamata di rete (getPublicUrl e' sincrona lato
// client Storage) - il bucket pubblico bypassa RLS per la lettura diretta
// dell'oggetto, nessun URL firmato/a scadenza.
export function urlPubblicoFotoHero(supabase: SupabaseClient): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH);
  return data.publicUrl;
}

export type InfoFotoHero = {
  esiste: boolean;
  aggiornatoIl: string | null;
};

// AC #3: mai mostrare un'immagine rotta se nessuna foto hero e' mai stata
// caricata - il chiamante (app/page.tsx, /app/impostazioni) verifica prima
// di costruire l'<img>/lo sfondo. aggiornatoIl (dai metadati dell'oggetto
// Storage) serve da cache-buster: urlPubblicoFotoHero() e' deterministico
// (sempre lo stesso URL per il path fisso "foto-hero"), quindi senza di
// esso il browser potrebbe continuare a mostrare la versione precedente
// dopo una sostituzione.
export async function leggiInfoFotoHero(
  supabase: SupabaseClient
): Promise<InfoFotoHero> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", { search: PATH });

  if (error) {
    throw new Error(error.message);
  }

  const oggetto = (data ?? []).find((o) => o.name === PATH);
  return {
    esiste: !!oggetto,
    aggiornatoIl: oggetto?.updated_at ?? null,
  };
}

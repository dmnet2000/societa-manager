import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "logo-applicazione";
const PATH = "logo";

// AD-12: bucket Storage pubblico (a differenza del bucket privato dei
// certificati medici, AD-6) - path fisso "logo", mai derivato da file.name
// (nessuna sanitizzazione necessaria, a differenza di
// lib/storage/certificati.ts: qui il path e' sempre lo stesso letterale).
// upsert: true sostituisce fisicamente il file precedente (a differenza di
// certificati.ts, dove upsert: false preserva ogni vecchia versione fino
// alla rimozione esplicita) - "un solo logo corrente" e' esattamente il
// comportamento desiderato qui (AC #1). contentType esplicito necessario:
// senza cartella/estensione nel path, il tipo servito dipende dal metadato
// salvato al momento dell'upload, non dal nome del file.
export async function caricaLogo(
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
// client Storage) - il bucket pubblico bypassa RLS per la lettura (AC #2),
// nessun URL firmato/a scadenza come per i certificati medici (AD-6).
export function urlPubblicoLogo(supabase: SupabaseClient): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH);
  return data.publicUrl;
}

export type InfoLogo = {
  esiste: boolean;
  aggiornatoIl: string | null;
};

// AC #5: mai mostrare un'immagine rotta se nessun logo e' mai stato
// caricato - il chiamante (page.tsx) verifica prima di costruire l'<img>.
// Review fix: restituisce anche `aggiornatoIl` (dai metadati dell'oggetto
// Storage) - urlPubblicoLogo() e' deterministico (sempre lo stesso URL per
// il path fisso "logo"), quindi senza un cache-buster il browser potrebbe
// continuare a mostrare la versione precedente dopo una sostituzione
// (revalidatePath invalida solo la cache RSC di Next.js, non le richieste
// dirette del browser verso l'endpoint pubblico di Supabase Storage).
export async function leggiInfoLogo(supabase: SupabaseClient): Promise<InfoLogo> {
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

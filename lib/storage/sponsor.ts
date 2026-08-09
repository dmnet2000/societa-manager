import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "sponsor-banner";

// Story 16.1: bucket pubblico (come "logo-applicazione", Story 7.2) ma path
// PER-ENTITA' (come "certificati-medici", Story 4.1) invece di un path
// fisso - ogni Sponsor ha la propria immagine, il path e' il suo id.
// upsert:true sostituisce fisicamente il file precedente (AC #2: "sostituita
// solo se ne viene caricata una nuova" - un solo file corrente per Sponsor,
// nessuno storico di versioni). contentType esplicito necessario: senza
// estensione nel path, il tipo servito dipende dal metadato salvato al
// momento dell'upload.
export async function caricaImmagineSponsor(
  supabase: SupabaseClient,
  sponsorId: string,
  file: File
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(sponsorId, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
}

// Deterministico (mirror di urlPubblicoLogo, lib/storage/logo.ts) - il
// bucket pubblico bypassa RLS per la lettura, nessun URL firmato/a scadenza
// necessario come per i certificati medici (AD-6).
export function urlPubblicoImmagineSponsor(
  supabase: SupabaseClient,
  sponsorId: string
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(sponsorId);
  return data.publicUrl;
}

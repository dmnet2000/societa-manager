import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "foto-squadra-gruppo";

// Story 18.4: bucket pubblico, path PER-ENTITA' (mirror di sponsor.ts,
// "sponsorId" come path) - qui il path e' il gruppoId, nessuna
// sottocartella (a differenza di foto-profilo.ts, path nidificato
// "{entitaId}/foto"). upsert:true sostituisce fisicamente il file
// precedente (AC #1: "sostituisce quella precedente se già presente").
// contentType esplicito necessario: senza estensione nel path, il tipo
// servito dipende dal metadato salvato al momento dell'upload.
export async function caricaFotoSquadra(
  supabase: SupabaseClient,
  gruppoId: string,
  file: File
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(gruppoId, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
}

// Deterministico (mirror di urlPubblicoImmagineSponsor) - il bucket
// pubblico bypassa RLS per la lettura, nessun URL firmato/a scadenza.
export function urlPubblicoFotoSquadra(
  supabase: SupabaseClient,
  gruppoId: string
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(gruppoId);
  return data.publicUrl;
}

// Story 18.4 (home pubblica, AC #3 + UI di upload per-Gruppo): UNA sola
// chiamata list() sull'intero bucket invece di una chiamata list() per ogni
// singolo Gruppo (mirror di leggiInfoLogo, ma qui su piu' entita' - prima
// occorrenza nel progetto di un "elenco di esistenza" multi-entita', Sponsor/
// logo sono singoli/singleton). La Map gruppoId -> aggiornatoIl serve sia a
// filtrare i Gruppi senza foto (nessun placeholder) sia al cache-busting
// "?v=" di ciascuna immagine, sia allo stato "Carica"/"Sostituisci" dei form
// di upload - unico punto di lettura per tutti e tre gli usi, non una
// funzione per-Gruppo separata (rimossa: nessun chiamante ne aveva bisogno).
export async function elencaGruppiConFoto(
  supabase: SupabaseClient
): Promise<Map<string, string | null>> {
  const { data, error } = await supabase.storage.from(BUCKET).list("");

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((o) => [o.name, o.updated_at ?? null]));
}

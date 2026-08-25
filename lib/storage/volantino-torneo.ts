import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "volantino-torneo";

// Story 20.5 (Epic 20, Torneo Memorial): bucket pubblico, path PER-ENTITA'
// (edizioneTorneoId), nessuna sottocartella - mirror esatto di
// lib/storage/foto-squadra.ts (Story 18.4, stesso principio "un file per
// entita', upsert sostituisce"), non del pattern singleton di foto-hero.ts
// (una sola foto per l'intero sito). contentType esplicito necessario: senza
// estensione nel path, il tipo servito dipende dal metadato salvato al
// momento dell'upload.
export async function caricaVolantinoTorneo(
  supabase: SupabaseClient,
  edizioneTorneoId: string,
  file: File
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(edizioneTorneoId, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
}

// Deterministico (mirror di urlPubblicoFotoSquadra) - il bucket pubblico
// bypassa RLS per la lettura, nessun URL firmato/a scadenza.
export function urlPubblicoVolantinoTorneo(
  supabase: SupabaseClient,
  edizioneTorneoId: string
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(edizioneTorneoId);
  return data.publicUrl;
}

export type InfoVolantinoTorneo = {
  esiste: boolean;
  aggiornatoIl: string | null;
};

// Mirror letterale di leggiInfoFotoHero (lib/storage/foto-hero.ts), ma
// parametrizzato per edizioneTorneoId invece del path fisso "foto-hero" -
// list("", {search: edizioneTorneoId}) e poi un confronto esatto su "name"
// (search e' un filtro di prefisso, non un match esatto). AC #3 di
// epics.md/spec-20-5: mai mostrare un'immagine rotta se nessun volantino e'
// mai stato caricato per questa Edizione - il chiamante
// (app/(torneo)/torneo/[edizioneId]/page.tsx) verifica "esiste" prima di
// costruire l'<img>. aggiornatoIl serve da cache-buster: urlPubblicoVolantinoTorneo
// e' deterministico (sempre lo stesso URL per un dato edizioneTorneoId),
// quindi senza di esso il browser potrebbe continuare a mostrare la versione
// precedente dopo una sostituzione.
export async function leggiInfoVolantinoTorneo(
  supabase: SupabaseClient,
  edizioneTorneoId: string
): Promise<InfoVolantinoTorneo> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", { search: edizioneTorneoId });

  if (error) {
    throw new Error(error.message);
  }

  const oggetto = (data ?? []).find((o) => o.name === edizioneTorneoId);
  return {
    esiste: !!oggetto,
    aggiornatoIl: oggetto?.updated_at ?? null,
  };
}

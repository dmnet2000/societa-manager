import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "contenuti-pagine-pubbliche";

// Story 19.10 (Epic 19, Ruolo Site Manager): a differenza di
// lib/storage/sponsor.ts (un'immagine per entita', path = id fisso), qui una
// singola Pagina puo' contenere piu' immagini inserite in punti diversi del
// contenuto (editor Tiptap, PaginaPubblicaEditor.tsx) - nessun "id di
// entita'" naturale da usare come path, ognuna prende un nome casuale
// (mirror del path per-file di lib/storage/certificati.ts, non per-entita').
// L'upload puo' avvenire anche PRIMA che la Pagina stessa esista (immagine
// inserita durante la creazione, /app/pagine-pubbliche/nuova, azione
// separata caricaImmaginePaginaAction) - per questo la funzione restituisce
// subito l'URL pubblico completo, da incorporare nel contenuto HTML lato
// client, invece di limitarsi a salvare il file come fa caricaImmagineSponsor
// (li' l'URL si deriva sempre dall'id noto dello Sponsor in un secondo
// momento; qui non esiste alcun id stabile da cui derivarlo dopo).
export async function caricaImmaginePaginaPubblica(
  supabase: SupabaseClient,
  file: File
): Promise<string> {
  const estensione = file.type === "image/png" ? "png" : "jpg";
  const path = `${randomUUID()}.${estensione}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

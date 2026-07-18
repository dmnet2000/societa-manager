import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "certificati-medici";

// Review fix: file.name arriva dal client senza alcuna garanzia sul
// contenuto - senza sanitizzazione, slash/".." produrrebbero percorsi
// annidati imprevedibili nel bucket (il primo segmento del percorso deve
// restare l'atletaId, unica garanzia su cui si basano le policy RLS su
// storage.objects) e caratteri di controllo o nomi lunghissimi potrebbero
// raggiungere l'API Storage senza filtro. Whitelist conservativa
// (alfanumerico, punto, trattino, underscore), lunghezza limitata.
function sanitizzaNomeFile(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

// AD-6: bucket Storage privato (Story 4.1) - percorso sempre nuovo (mai
// sovrascrittura silenziosa dello stesso oggetto, upsert: false): la
// "sostituzione" del Certificato avviene a livello di riga
// CertificatoMedico.filePath (lib/db-rls/certificato-medico.ts), non di file
// fisico di per se' - il vecchio file va rimosso esplicitamente dal
// chiamante con rimuoviFileCertificato quando applicabile (Story 4.1 review
// fix). RLS su storage.objects (migrazione Story 4.1) e' l'unica autorita'
// che decide se l'upload riesce - nessun controllo applicativo duplicato
// sull'appartenenza dell'atletaId (stesso principio gia' stabilito per
// "presenze", Story 3.1).
export async function caricaFileCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  file: File
): Promise<string> {
  const path = `${atletaId}/${randomUUID()}-${sanitizzaNomeFile(file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

// Story 4.1 review fix (AC #4): rimuove il file sostituito da un
// ri-caricamento, cosi' lo storage non cresce senza limite per il caso piu'
// comune (correzione di un caricamento errato). RLS su storage.objects
// verifica i permessi al momento della chiamata, stesso principio delle
// altre funzioni di questo modulo.
export async function rimuoviFileCertificato(
  supabase: SupabaseClient,
  filePath: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) {
    throw new Error(error.message);
  }
}

// Story 4.3: scarica i byte del file (non un URL) - serve per allegarlo
// all'email inviata alla Segreteria (lib/email/invia-email.ts). RLS su
// storage.objects verifica i permessi al momento della chiamata, stessa
// policy SELECT gia' usata per generaUrlFirmato - nessun controllo
// applicativo duplicato, nessuna nuova policy.
export async function scaricaFileCertificato(
  supabase: SupabaseClient,
  filePath: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile scaricare il Certificato.");
  }

  return data;
}

// AC #2: URL a scadenza breve (5 minuti di default), generato on-demand -
// mai pre-generato e persistito, che ne vanificherebbe la scadenza. RLS su
// storage.objects verifica i permessi al momento della chiamata.
export async function generaUrlFirmato(
  supabase: SupabaseClient,
  filePath: string,
  scadenzaSecondi = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, scadenzaSecondi);

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile generare l'URL firmato.");
  }

  return data.signedUrl;
}

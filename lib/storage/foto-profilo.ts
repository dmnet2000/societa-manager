import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Story 9.12: bucket PRIVATI (a differenza di "logo-applicazione", pubblico)
// - le foto riguardano persone reali, incluse Atlete minorenni, stessa
// cautela di AD-6/"certificati-medici". Generico sul bucket (parametro),
// invece di un path letterale fisso come il logo, perche' qui il path varia
// per entita' (Atleta vs Allenatore).
export const BUCKET_FOTO_ATLETA = "foto-profilo-atlete";
export const BUCKET_FOTO_ALLENATORE = "foto-profilo-allenatori";

export const MIME_AMMESSI_FOTO = ["image/jpeg", "image/png"];
export const DIMENSIONE_MASSIMA_FOTO_BYTE = 5 * 1024 * 1024;

// Mappa locale ristretta a jpeg/png - non riesportare/estendere quella di
// lib/storage/certificati.ts (resta privata a quel modulo), piccola
// duplicazione di 2 righe accettabile per un solo altro punto di utilizzo.
const MAGIC_BYTES_FOTO: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export async function contenutoCorrispondeAlMimeDichiaratoFoto(
  file: File
): Promise<boolean> {
  const magic = MAGIC_BYTES_FOTO[file.type];
  if (!magic) return false;
  const intestazione = new Uint8Array(
    await file.slice(0, magic.length).arrayBuffer()
  );
  return magic.every((byte, i) => intestazione[i] === byte);
}

// Path fisso "{entitaId}/foto" (nessuna estensione nel path, contentType
// esplicito nei metadati) - stesso identico pattern di caricaLogo
// (lib/storage/logo.ts), upsert:true sostituisce fisicamente la foto
// precedente: "una sola foto corrente" e' esattamente il comportamento
// desiderato (AC #2).
// Review fix (code review Story 9.12, Blind Hunter): a differenza di
// lib/storage/certificati.ts, questa funzione non valida MIME/dimensione
// del file ne' sanitizza `entitaId` - deliberato, non un oversight. Il
// chiamante (app/il-mio-profilo/actions.ts) valida gia' il file prima di
// invocarla, ed `entitaId` e' sempre risolto lato server da Prisma
// (mai da un campo form/file.name come invece avviene in certificati.ts),
// quindi non serve una sanitizzazione dei caratteri.
export async function caricaFotoProfilo(
  supabase: SupabaseClient,
  bucket: string,
  entitaId: string,
  file: File
): Promise<void> {
  const path = `${entitaId}/foto`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(error.message);
  }
}

export type InfoFotoProfilo = {
  esiste: boolean;
  aggiornatoIl: string | null;
};

// Stesso pattern di leggiInfoLogo (lib/storage/logo.ts): mai mostrare
// un'immagine rotta se nessuna foto e' mai stata caricata - il chiamante
// (page.tsx) verifica prima di costruire l'<img>.
export async function esisteFotoProfilo(
  supabase: SupabaseClient,
  bucket: string,
  entitaId: string
): Promise<InfoFotoProfilo> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(entitaId, { search: "foto" });

  if (error) {
    throw new Error(error.message);
  }

  const oggetto = (data ?? []).find((o) => o.name === "foto");
  return {
    esiste: !!oggetto,
    aggiornatoIl: oggetto?.updated_at ?? null,
  };
}

// URL a scadenza breve (5 minuti di default), generato on-demand - stesso
// principio di generaUrlFirmato (lib/storage/certificati.ts): mai
// pre-generato e persistito, che ne vanificherebbe la scadenza.
export async function generaUrlFirmatoFotoProfilo(
  supabase: SupabaseClient,
  bucket: string,
  entitaId: string,
  scadenzaSecondi = 300
): Promise<string> {
  const path = `${entitaId}/foto`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, scadenzaSecondi);

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile generare l'URL firmato.");
  }

  return data.signedUrl;
}

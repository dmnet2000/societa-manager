"use server";

import { revalidatePath } from "next/cache";
import type { TipoSponsor } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { caricaImmagineSponsor } from "@/lib/storage/sponsor";
import {
  MIME_AMMESSI_IMMAGINE,
  DIMENSIONE_MASSIMA_IMMAGINE_BYTE,
  contenutoCorrispondeAlMimeImmagine,
} from "@/lib/storage/validazione-immagine";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type SponsorActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const TIPI_VALIDI: TipoSponsor[] = ["BANNER", "CONVENZIONE"];

// Review fix (2026-08-09, Blind Hunter): nome/descrizione erano TEXT non
// vincolati, poi resi in una vetrina pubblica (Story 16.2) - limiti
// difensivi, stesso principio di LUNGHEZZA_MASSIMA_NOME_SETTORE
// (logo/actions.ts) e LUNGHEZZA_MASSIMA_LINK_FIPAV (campionati/actions.ts).
const LUNGHEZZA_MASSIMA_NOME = 100;
const LUNGHEZZA_MASSIMA_DESCRIZIONE = 1000;
const LUNGHEZZA_MASSIMA_LINK_ESTERNO = 500;

function leggiCampiComuni(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "").trim(),
    descrizione: String(formData.get("descrizione") ?? "").trim(),
    linkEsterno: String(formData.get("linkEsterno") ?? "").trim() || null,
  };
}

// Review fix (2026-08-09, Edge Case Hunter + Blind Hunter, trovato
// indipendentemente da entrambi): mirror esatto di linkFipavValido
// (app/(partite-campionati)/campionati/actions.ts, Story 10.8 review fix) -
// linkEsterno e' testo libero destinato a essere reso come href cliccabile
// nella vetrina pubblica di Story 16.2. Senza questo controllo un valore
// "javascript:..."/"data:..." verrebbe salvato ed eseguito nella sessione
// di chiunque clicchi il link. type="url" lato client non e' una
// protezione (bypassabile chiamando la Server Action direttamente).
// Richiede esplicitamente http/https.
function linkEsternoValido(valore: string): boolean {
  if (valore.length > LUNGHEZZA_MASSIMA_LINK_ESTERNO) return false;
  try {
    const url = new URL(valore);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validaCampiComuni(campi: {
  nome: string;
  tipo: string;
  descrizione: string;
  linkEsterno: string | null;
}): { code: string; message: string } | null {
  if (!campi.nome) {
    return { code: "VALIDATION", message: "Il nome dello Sponsor è obbligatorio." };
  }
  if (campi.nome.length > LUNGHEZZA_MASSIMA_NOME) {
    return {
      code: "VALIDATION",
      message: `Il nome dello Sponsor supera i ${LUNGHEZZA_MASSIMA_NOME} caratteri.`,
    };
  }
  if (!TIPI_VALIDI.includes(campi.tipo as TipoSponsor)) {
    return { code: "VALIDATION", message: "Tipo Sponsor non valido." };
  }
  if (!campi.descrizione) {
    return { code: "VALIDATION", message: "La descrizione è obbligatoria." };
  }
  if (campi.descrizione.length > LUNGHEZZA_MASSIMA_DESCRIZIONE) {
    return {
      code: "VALIDATION",
      message: `La descrizione supera i ${LUNGHEZZA_MASSIMA_DESCRIZIONE} caratteri.`,
    };
  }
  if (campi.linkEsterno && !linkEsternoValido(campi.linkEsterno)) {
    return {
      code: "VALIDATION",
      message: "Il link esterno non è valido (deve iniziare con http:// o https://).",
    };
  }
  return null;
}

// Stessa validazione immagine di caricaLogoAction (mirror, non reinventare) -
// vedi lib/storage/validazione-immagine.ts.
async function validaImmagine(
  file: FormDataEntryValue | null
): Promise<{ code: string; message: string } | { file: File }> {
  if (!(file instanceof File) || file.size === 0) {
    return { code: "VALIDATION", message: "Seleziona un'immagine da caricare." };
  }
  if (!MIME_AMMESSI_IMMAGINE.includes(file.type)) {
    return { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." };
  }
  if (file.size > DIMENSIONE_MASSIMA_IMMAGINE_BYTE) {
    return { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." };
  }
  if (!(await contenutoCorrispondeAlMimeImmagine(file))) {
    return {
      code: "VALIDATION",
      message: "Il contenuto del file non corrisponde al formato dichiarato.",
    };
  }
  return { file };
}

// AC #1: l'immagine e' obbligatoria alla creazione (a differenza della
// modifica, AC #2) - uno Sponsor senza banner non ha senso nella vetrina
// pubblica (Story 16.2). La riga Sponsor viene creata PRIMA dell'upload
// (serve il suo id per il path per-entita', lib/storage/sponsor.ts) - se
// l'upload fallisce, la riga viene rimossa (best-effort) invece di restare
// orfana senza immagine: a differenza del logo/certificati (dove l'entita'
// esiste comunque a prescindere dall'asset), qui la riga senza immagine
// romperebbe la vetrina pubblica in modo permanente, non solo per un
// caricamento.
export async function creaSponsor(
  _prevState: SponsorActionState,
  formData: FormData
): Promise<SponsorActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const campi = leggiCampiComuni(formData);
  const erroreCampi = validaCampiComuni(campi);
  if (erroreCampi) return { error: erroreCampi };

  const risultatoImmagine = await validaImmagine(formData.get("file"));
  if (!("file" in risultatoImmagine)) return { error: risultatoImmagine };

  let sponsorId: string;
  try {
    const sponsor = await prisma.sponsor.create({
      data: {
        nome: campi.nome,
        tipo: campi.tipo as TipoSponsor,
        descrizione: campi.descrizione,
        linkEsterno: campi.linkEsterno,
      },
    });
    sponsorId = sponsor.id;
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare lo Sponsor. Riprova." },
    };
  }

  try {
    const supabase = await createClient();
    await caricaImmagineSponsor(supabase, sponsorId, risultatoImmagine.file);
  } catch (err) {
    console.error(err);
    try {
      await prisma.sponsor.delete({ where: { id: sponsorId } });
    } catch (cleanupErr) {
      console.error(cleanupErr);
    }
    return {
      error: { code: "INTERNAL", message: "Impossibile caricare l'immagine. Riprova." },
    };
  }

  revalidatePath("/app/sponsor");
  return { success: true };
}

// AC #2: l'immagine e' opzionale in modifica ("con o senza sostituire
// l'immagine") - a differenza di creaSponsor sopra.
export async function aggiornaSponsor(
  _prevState: SponsorActionState,
  formData: FormData
): Promise<SponsorActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const campi = leggiCampiComuni(formData);
  const erroreCampi = validaCampiComuni(campi);
  if (erroreCampi) return { error: erroreCampi };

  const file = formData.get("file");
  let fileDaCaricare: File | null = null;
  if (file instanceof File && file.size > 0) {
    const risultatoImmagine = await validaImmagine(file);
    if (!("file" in risultatoImmagine)) return { error: risultatoImmagine };
    fileDaCaricare = risultatoImmagine.file;
  }

  try {
    await prisma.sponsor.update({
      where: { id },
      data: {
        nome: campi.nome,
        tipo: campi.tipo as TipoSponsor,
        descrizione: campi.descrizione,
        linkEsterno: campi.linkEsterno,
      },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare lo Sponsor. Riprova." },
    };
  }

  if (fileDaCaricare) {
    try {
      const supabase = await createClient();
      await caricaImmagineSponsor(supabase, id, fileDaCaricare);
    } catch (err) {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile aggiornare l'immagine. Riprova." },
      };
    }
  }

  revalidatePath("/app/sponsor");
  return { success: true };
}

// AC #3/#4: toggle bidirezionale unico (impostaAttivaSponsor) invece di due
// funzioni separate disattiva/riattiva - nessun precedente diretto nel
// progetto per un toggle bidirezionale sulla stessa entita' (vedi Dev Notes
// della story), scelta la soluzione piu' semplice.
export async function impostaAttivaSponsor(
  _prevState: SponsorActionState,
  formData: FormData
): Promise<SponsorActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const attivaGrezzo = formData.get("attiva");

  // Review fix (2026-08-09, Edge Case Hunter + Blind Hunter, trovato
  // indipendentemente da entrambi): un valore mancante/malformato veniva
  // silenziosamente trattato come "false" (=== "true" non corrisponde),
  // disattivando uno Sponsor senza errore invece di rifiutare la richiesta.
  if (attivaGrezzo !== "true" && attivaGrezzo !== "false") {
    return { error: { code: "VALIDATION", message: "Valore di stato non valido." } };
  }
  const attiva = attivaGrezzo === "true";

  try {
    await prisma.sponsor.update({ where: { id }, data: { attiva } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare lo stato dello Sponsor. Riprova." },
    };
  }

  revalidatePath("/app/sponsor");
  return { success: true };
}

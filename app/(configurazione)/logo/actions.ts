"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { caricaLogo } from "@/lib/storage/logo";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type LogoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Stesso allowlist e limite del bucket "logo-applicazione" (migrazione
// Story 7.2) - doppia difesa, mai fidarsi solo dell'attributo "accept" del
// form lato client (stesso principio di Story 4.1). Niente SVG: puo'
// contenere script eseguibile, rischio XSS diretto per un asset pubblico.
const MIME_AMMESSI = ["image/png", "image/jpeg"];
const DIMENSIONE_MASSIMA_BYTE = 2 * 1024 * 1024;

// Stesso principio di contenutoCorrispondeAlMimeDichiarato
// (certificato-medico/actions.ts, Story 4.1 review fix), qui non
// condivisa/esportata: allowlist ristretta a PNG/JPEG per questo modulo.
// Firma PNG completa a 8 byte (review fix: un controllo troncato ai primi
// 4 byte accettava file con solo il prefisso corretto).
const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

async function contenutoCorrispondeAlMimeDichiarato(file: File): Promise<boolean> {
  const magic = MAGIC_BYTES[file.type];
  if (!magic) return false;
  const intestazione = new Uint8Array(
    await file.slice(0, magic.length).arrayBuffer()
  );
  return magic.every((byte, i) => intestazione[i] === byte);
}

// AC #1/#3: a differenza di "certificati" (Story 3.1/4.1, dove RLS decide
// l'APPARTENENZA di un atletaId e requireRuolo(Ruolo) e' un controllo
// distinto e complementare), qui l'unico asse di accesso e' il Ruolo - non
// c'e' una dimensione di appartenenza da delegare a RLS. requireRuolo("ADMIN")
// sotto e la policy RLS ADMIN-only (migrazione Story 7.2) verificano
// deliberatamente la STESSA cosa, in profondita' (difesa in profondita',
// non uno strato "duplicato per errore"): se uno dei due venisse rimosso
// per sbaglio, l'altro resta comunque a proteggere l'upload.
export async function caricaLogoAction(
  _prevState: LogoActionState,
  formData: FormData
): Promise<LogoActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    };
  }
  if (!MIME_AMMESSI.includes(file.type)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Formato immagine non ammesso (solo PNG, JPG).",
      },
    };
  }
  if (file.size > DIMENSIONE_MASSIMA_BYTE) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il file supera la dimensione massima di 2MB.",
      },
    };
  }
  if (!(await contenutoCorrispondeAlMimeDichiarato(file))) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    };
  }

  try {
    const supabase = await createClient();
    await caricaLogo(supabase, file);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile caricare il logo. Riprova." },
    };
  }

  revalidatePath("/logo");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { caricaLogo } from "@/lib/storage/logo";
import { salvaNomeSettore } from "@/lib/configurazione-applicazione";
import {
  MIME_AMMESSI_IMMAGINE,
  DIMENSIONE_MASSIMA_IMMAGINE_BYTE,
  contenutoCorrispondeAlMimeImmagine,
} from "@/lib/storage/validazione-immagine";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type LogoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

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
  if (!MIME_AMMESSI_IMMAGINE.includes(file.type)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Formato immagine non ammesso (solo PNG, JPG).",
      },
    };
  }
  if (file.size > DIMENSIONE_MASSIMA_IMMAGINE_BYTE) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il file supera la dimensione massima di 2MB.",
      },
    };
  }
  if (!(await contenutoCorrispondeAlMimeImmagine(file))) {
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

const LUNGHEZZA_MASSIMA_NOME_SETTORE = 60;

// Stesso schema { error }/{ success: true } di caricaLogoAction sopra.
export type NomeSettoreActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Nessuna dimensione di appartenenza da delegare a RLS (stesso principio del
// commento su caricaLogoAction) - requireRuolo("ADMIN") e' l'unico controllo
// qui, dato che "configurazione_applicazione" non e' protetta da RLS (vedi
// prisma/schema.prisma): a differenza del logo, qui non c'e' una seconda
// difesa in profondita' a livello database, requireRuolo resta l'unico
// cancello.
export async function salvaNomeSettoreAction(
  _prevState: NomeSettoreActionState,
  formData: FormData
): Promise<NomeSettoreActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const valore = String(formData.get("nomeSettore") ?? "").trim();

  if (valore.length > LUNGHEZZA_MASSIMA_NOME_SETTORE) {
    return {
      error: {
        code: "VALIDATION",
        message: `Il nome del settore supera i ${LUNGHEZZA_MASSIMA_NOME_SETTORE} caratteri.`,
      },
    };
  }

  try {
    // Stringa vuota = l'Admin vuole rimuovere il nome del settore (torna a
    // non mostrare nulla in NavBar/login), non un valore letterale vuoto.
    await salvaNomeSettore(valore || null);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile salvare il nome del settore. Riprova." },
    };
  }

  revalidatePath("/logo");
  return { success: true };
}

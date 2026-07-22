"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import {
  caricaFileCertificato,
  generaUrlFirmato,
  MIME_AMMESSI,
  DIMENSIONE_MASSIMA_BYTE,
  contenutoCorrispondeAlMimeDichiarato,
} from "@/lib/storage/certificati";
import { confermaCertificato as salvaCertificatoConfermato } from "@/lib/db-rls/certificato-medico";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type ConfermaCertificatoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// Review fix: `new Date("2026-02-30")` non produce un Invalid Date - JS
// normalizza silenziosamente al 2 marzo. Il round-trip verso ISO (stesso
// giorno/mese/anno) e' l'unico modo affidabile per rifiutare una data
// calendarialmente inesistente, il solo controllo di formato/regex non basta.
function parseDataValida(raw: string): Date | null {
  const data = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== raw) {
    return null;
  }
  return data;
}

// FR-14, AC #1/#2: un solo Server Action copre sia la conferma di un
// Certificato gia' caricato (Story 4.1) sia l'inserimento manuale ex-novo
// (file allegato opzionale - un certificato ricevuto cartaceo puo' non
// avere mai una scansione digitale). Ruoli ammessi: stesso gruppo ad
// accesso ampio delle policy RLS su "certificati_medici" (AD-4), non solo
// Segreteria.
export async function confermaCertificato(
  _prevState: ConfermaCertificatoActionState,
  formData: FormData
): Promise<ConfermaCertificatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"]);
  if (forbidden) return forbidden;

  const atletaId = String(formData.get("atletaId") ?? "");
  const dataInizioValiditaRaw = String(formData.get("dataInizioValidita") ?? "");
  const dataFineValiditaRaw = String(formData.get("dataFineValidita") ?? "");
  const mesiValiditaRaw = String(formData.get("mesiValidita") ?? "");
  const moduloRaw = String(formData.get("modulo") ?? "");
  const file = formData.get("file");

  if (!atletaId) {
    return {
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    };
  }
  if (!dataFineValiditaRaw) {
    return {
      error: {
        code: "VALIDATION",
        message: "La data di fine validità è obbligatoria.",
      },
    };
  }
  if (!FORMATO_DATA.test(dataFineValiditaRaw)) {
    return {
      error: { code: "VALIDATION", message: "Data di fine validità non valida." },
    };
  }
  const dataFineValidita = parseDataValida(dataFineValiditaRaw);
  if (!dataFineValidita) {
    return {
      error: { code: "VALIDATION", message: "Data di fine validità non valida." },
    };
  }

  let dataInizioValidita: Date | null = null;
  if (dataInizioValiditaRaw) {
    if (!FORMATO_DATA.test(dataInizioValiditaRaw)) {
      return {
        error: {
          code: "VALIDATION",
          message: "Data di inizio validità non valida.",
        },
      };
    }
    dataInizioValidita = parseDataValida(dataInizioValiditaRaw);
    if (!dataInizioValidita) {
      return {
        error: {
          code: "VALIDATION",
          message: "Data di inizio validità non valida.",
        },
      };
    }
    if (dataInizioValidita > dataFineValidita) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "La data di inizio validità non può essere successiva alla data di fine.",
        },
      };
    }
  }

  let mesiValidita: number | null = null;
  if (mesiValiditaRaw) {
    const parsed = Number(mesiValiditaRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return {
        error: { code: "VALIDATION", message: "Mesi di validità non validi." },
      };
    }
    mesiValidita = parsed;
  }

  const modulo = moduloRaw || null;

  // Stesso allowlist/verifica del contenuto di Story 4.1 (condivisa via
  // lib/storage/certificati.ts) - il file e' opzionale qui (Dev Notes: un
  // certificato ricevuto cartaceo puo' non avere mai una scansione).
  const haFile = file instanceof File && file.size > 0;
  if (haFile) {
    if (!MIME_AMMESSI.includes(file.type)) {
      return {
        error: {
          code: "VALIDATION",
          message: "Formato file non ammesso (solo PDF, JPG, PNG).",
        },
      };
    }
    if (file.size > DIMENSIONE_MASSIMA_BYTE) {
      return {
        error: {
          code: "VALIDATION",
          message: "Il file supera la dimensione massima di 10MB.",
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
  }

  try {
    const supabase = await createClient();
    const filePath = haFile
      ? await caricaFileCertificato(supabase, atletaId, file)
      : undefined;

    await salvaCertificatoConfermato(supabase, atletaId, {
      dataInizioValidita,
      dataFineValidita,
      mesiValidita,
      modulo,
      ...(filePath !== undefined ? { filePath } : {}),
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare il Certificato. Riprova.",
      },
    };
  }

  revalidatePath("/conferma-certificati");
  return { success: true };
}

// AC #1: la Segreteria (o Admin/Dirigente) deve poter aprire il file gia'
// caricato per leggere le date reali prima di confermarle - stesso pattern
// di ottieniUrlCertificato (certificato-medico/actions.ts, Story 4.1), Ruoli
// ammessi diversi (AD-4: gruppo ad accesso ampio, non Genitore/Atleta). RLS
// SELECT su storage.objects per questi tre Ruoli esiste gia' dalla
// migrazione 20260718020000_certificati_storage_e_rls.
export async function ottieniUrlCertificatoConferma(
  filePath: string
): Promise<void> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"]);
  if (forbidden) {
    redirect("/conferma-certificati");
  }

  const supabase = await createClient();
  // Review fix pattern gia' stabilito (Story 4.1, ottieniUrlCertificato):
  // nessuna redirect() dentro il try - redirect() lancia un'eccezione di
  // controllo che il catch qui sotto intercetterebbe come errore generico.
  let url: string | undefined;
  try {
    url = await generaUrlFirmato(supabase, filePath);
  } catch (err) {
    console.error(err);
  }

  redirect(url ?? "/conferma-certificati");
}

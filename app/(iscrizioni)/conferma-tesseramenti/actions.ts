"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { trovaIscrizioneAttiva } from "@/lib/db-rls/iscrizione";

export type ConfermaTesseramentoState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 13.1: Tesseramento e' strutturale (AD-9, no RLS) - Prisma diretto,
// stesso stile di creaPalestra (app/(orari-palestre)/palestre/actions.ts) -
// ma la dipendenza obbligatoria dall'Iscrizione (AC #3) e' RLS-protetta,
// serve quindi anche il client Supabase per trovaIscrizioneAttiva, stesso
// pattern misto gia' in uso in app/(gruppi-allenatori)/gruppi/actions.ts.
export async function confermaTesseramento(
  _prevState: ConfermaTesseramentoState,
  atletaId: string
): Promise<ConfermaTesseramentoState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  try {
    const anno = await risolviAnnoAgonisticoCorrente();

    const supabase = await createClient();
    const iscrizioneAttiva = await trovaIscrizioneAttiva(
      supabase,
      atletaId,
      anno.id
    );
    if (!iscrizioneAttiva) {
      return {
        error: {
          code: "VALIDATION",
          message:
            "L'Iscrizione dell'Atleta deve essere confermata prima del Tesseramento.",
        },
      };
    }

    // AC #4: idempotente - upsert con update no-op, a differenza di
    // inserisciIscrizione (Story 1.6) non serve gestire una riattivazione:
    // Tesseramento non ha un concetto di esclusione in questa storia.
    await prisma.tesseramento.upsert({
      where: {
        atletaId_annoAgonisticoId: { atletaId, annoAgonisticoId: anno.id },
      },
      create: { atletaId, annoAgonisticoId: anno.id },
      update: {},
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare il Tesseramento. Riprova.",
      },
    };
  }

  revalidatePath("/conferma-tesseramenti");
  return { success: true };
}

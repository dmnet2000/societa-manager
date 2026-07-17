"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { disattivaIscrizione, inserisciIscrizione } from "@/lib/db-rls/iscrizione";

export type ConfermaIscrizioneState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

export type EscludiIscrizioneState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #5: FR-17 nomina esplicitamente solo la Segreteria (a differenza di
// FR-19/FR-20 "Admin o Dirigente") - requireRuolo con un singolo Ruolo, non
// un array. L'accesso piu' ampio di Admin/Dirigente resta comunque alla
// policy RLS (AD-4).
export async function confermaIscrizione(
  _prevState: ConfermaIscrizioneState,
  atletaId: string
): Promise<ConfermaIscrizioneState> {
  const forbidden = await requireRuolo("SEGRETERIA");
  if (forbidden) return forbidden;

  try {
    // AC #3: find-or-create - mai da una pagina in sola lettura (vedi
    // Dev Notes), solo qui nel percorso di scrittura.
    const anno = await risolviAnnoAgonisticoCorrente();

    const supabase = await createClient();
    // AC #2, #4: idempotente - vedi lib/db-rls/iscrizione.ts.
    await inserisciIscrizione(supabase, atletaId, anno.id);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare l'iscrizione. Riprova.",
      },
    };
  }

  revalidatePath("/conferma-iscrizioni");
  return { success: true };
}

// Story 1.8 AC #4: FR-23 nomina esplicitamente Admin, Dirigente e Segreteria
// per l'esclusione - a differenza di confermaIscrizione (solo Segreteria,
// FR-17), qui i Ruoli ammessi sono tre. L'accesso RLS resta comunque il
// cancello finale (AD-4).
export async function escludiIscrizione(
  _prevState: EscludiIscrizioneState,
  iscrizioneId: string
): Promise<EscludiIscrizioneState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"]);
  if (forbidden) return forbidden;

  try {
    const supabase = await createClient();
    await disattivaIscrizione(supabase, iscrizioneId);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile escludere l'iscrizione. Riprova.",
      },
    };
  }

  revalidatePath("/conferma-iscrizioni");
  return { success: true };
}

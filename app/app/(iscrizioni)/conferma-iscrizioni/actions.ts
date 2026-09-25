"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import {
  disattivaIscrizione,
  disattivaIscrizioneAttivaPerAtleta,
  inserisciIscrizione,
} from "@/lib/db-rls/iscrizione";
import {
  annullaRimozioneAtleta,
  MOTIVI_RIMOZIONE_ATLETA,
  segnaAtletaRimossa,
  type DatiRimozioneAtleta,
} from "@/lib/db-rls/atleta";

export type ConfermaIscrizioneState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

export type EscludiIscrizioneState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

export type RimuoviAtletaState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

export type RipristinaAtletaState =
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

  revalidatePath("/app/conferma-iscrizioni");
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

  revalidatePath("/app/conferma-iscrizioni");
  return { success: true };
}

// Story 9.43 (review fix): lunghezza massima della nota anche lato server -
// il maxLength={500} di RimuoviAtletaForm.tsx e' solo un vincolo del
// browser, aggirabile da una richiesta costruita a mano.
const NOTA_RIMOZIONE_LUNGHEZZA_MASSIMA = 500;

// Story 9.43 (AC #1/#2/#10): mirror esatto di escludiIscrizione sopra per il
// perimetro di autorizzazione (stessi 3 Ruoli). A differenza di
// escludiIscrizione, riceve una FormData (non un id nudo): la UI richiede un
// motivo obbligatorio + una nota facoltativa, mai un solo click (la
// conferma a due passaggi vive lato client, RimuoviAtletaForm.tsx). Motivo
// mancante/non valido -> VALIDATION, nessuna scrittura (arriva qui anche
// bypassando il <select required> lato client, stesso principio difensivo
// di linkFipavValido/coloreValido in campionati/actions.ts).
export async function rimuoviAtleta(
  _prevState: RimuoviAtletaState,
  formData: FormData
): Promise<RimuoviAtletaState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"]);
  if (forbidden) return forbidden;

  const atletaId = String(formData.get("atletaId") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const notaGrezza = String(formData.get("nota") ?? "").trim();
  const nota = notaGrezza
    ? notaGrezza.slice(0, NOTA_RIMOZIONE_LUNGHEZZA_MASSIMA)
    : null;

  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }
  if (
    !MOTIVI_RIMOZIONE_ATLETA.includes(
      motivo as DatiRimozioneAtleta["motivoRimozione"]
    )
  ) {
    return {
      error: {
        code: "VALIDATION",
        message: "Seleziona il motivo della rimozione.",
      },
    };
  }

  try {
    const supabase = await createClient();
    // Story 9.43 (review fix, AC #2): l'Iscrizione della stagione corrente
    // (se presente) va cercata qui, non passata dal client - vedi il
    // commento di disattivaIscrizioneAttivaPerAtleta in lib/db-rls/
    // iscrizione.ts. Disattivata PRIMA di segnare l'Atleta rimossa (non
    // dopo): e' idempotente e sicura da ripetere, quindi se il secondo
    // passo fallisse lo stato intermedio resterebbe comunque coerente
    // (un'Atleta non ancora rimossa con l'Iscrizione disattivata equivale
    // a un "Escludi" già esistente, mai un'Atleta rimossa con
    // un'Iscrizione ancora attiva, che violerebbe l'AC #2).
    const anno = await risolviAnnoAgonisticoCorrente();
    await disattivaIscrizioneAttivaPerAtleta(supabase, atletaId, anno.id);
    await segnaAtletaRimossa(supabase, atletaId, {
      motivoRimozione: motivo as DatiRimozioneAtleta["motivoRimozione"],
      notaRimozione: nota,
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile rimuovere l'Atleta dalla società. Riprova.",
      },
    };
  }

  revalidatePath("/app/conferma-iscrizioni");
  return { success: true };
}

// Story 9.43 (AC #7/#10): stesso perimetro di rimuoviAtleta sopra. Azzera i
// 3 campi (annullaRimozioneAtleta) - nessun ripristino automatico
// dell'Iscrizione, l'Atleta torna "non iscritta" (AC #7).
export async function ripristinaAtleta(
  _prevState: RipristinaAtletaState,
  formData: FormData
): Promise<RipristinaAtletaState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "SEGRETERIA"]);
  if (forbidden) return forbidden;

  const atletaId = String(formData.get("atletaId") ?? "").trim();
  if (!atletaId) {
    return { error: { code: "VALIDATION", message: "Atleta non specificata." } };
  }

  try {
    const supabase = await createClient();
    await annullaRimozioneAtleta(supabase, atletaId);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile ripristinare l'Atleta. Riprova.",
      },
    };
  }

  revalidatePath("/app/conferma-iscrizioni");
  return { success: true };
}

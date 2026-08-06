"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { salvaEmailSegreteria } from "@/lib/configurazione-applicazione";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type EmailSegreteriaActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_EMAIL = 254;
// Formato semplice, stesso livello di rigore gia' accettato altrove nel
// progetto (nessuna libreria di validazione dedicata) - basta a scartare
// valori chiaramente non plausibili, non una RFC 5322 completa.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Story 9.31: mirror di salvaNomeSettoreAction (app/(configurazione)/logo/actions.ts)
// - stesso perimetro (ConfigurazioneApplicazione, no-RLS, requireRuolo come
// unico cancello).
export async function salvaEmailSegreteriaAction(
  _prevState: EmailSegreteriaActionState,
  formData: FormData
): Promise<EmailSegreteriaActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const valore = String(formData.get("emailSegreteria") ?? "").trim();

  if (valore.length > LUNGHEZZA_MASSIMA_EMAIL) {
    return {
      error: {
        code: "VALIDATION",
        message: `L'indirizzo email supera i ${LUNGHEZZA_MASSIMA_EMAIL} caratteri.`,
      },
    };
  }
  if (valore && !FORMATO_EMAIL.test(valore)) {
    return {
      error: { code: "VALIDATION", message: "Indirizzo email non valido." },
    };
  }

  try {
    // Stringa vuota = l'Admin vuole rimuovere la configurazione (nessuna
    // email di notifica verra' piu' inviata), non un valore letterale
    // vuoto - stesso principio di salvaNomeSettoreAction.
    await salvaEmailSegreteria(valore || null);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare l'Email Segreteria. Riprova.",
      },
    };
  }

  revalidatePath("/impostazioni");
  return { success: true };
}

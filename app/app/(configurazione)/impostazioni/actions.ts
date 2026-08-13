"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { salvaEmailSegreteria, salvaUrlPaginaFacebook } from "@/lib/configurazione-applicazione";

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

  revalidatePath("/app/impostazioni");
  return { success: true };
}

export type PaginaFacebookActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const LUNGHEZZA_MASSIMA_LINK_ESTERNO = 500;

// Mirror di linkEsternoValido (app/(sponsor)/sponsor/actions.ts, Story 16.1
// review fix) / linkFipavValido (app/(partite-campionati)/campionati/actions.ts,
// Story 10.8 review fix) - il valore finisce incorporato nell'URL del Page
// Plugin di Facebook (lib/embed-facebook.ts), un javascript:/data: non
// validato qui sarebbe un problema anche in quel contesto.
function urlPaginaFacebookValido(valore: string): boolean {
  if (valore.length > LUNGHEZZA_MASSIMA_LINK_ESTERNO) return false;
  try {
    const url = new URL(valore);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Story 18.5 (AC #1): a differenza di salvaEmailSegreteriaAction sopra
// (ADMIN-only), qui requireRuolo ammette anche DIRIGENTE - stesso array a
// due Ruoli gia' usato altrove nel progetto (es.
// wizard-nuova-stagione/actions.ts).
export async function salvaUrlPaginaFacebookAction(
  _prevState: PaginaFacebookActionState,
  formData: FormData
): Promise<PaginaFacebookActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const valore = String(formData.get("urlPaginaFacebook") ?? "").trim();

  if (valore && !urlPaginaFacebookValido(valore)) {
    return {
      error: {
        code: "VALIDATION",
        message:
          "URL non valido (deve iniziare con http:// o https:// ed essere entro 500 caratteri).",
      },
    };
  }

  try {
    // Stringa vuota = l'Admin/Dirigente vuole rimuovere la configurazione
    // (la sezione social smette di comparire in home, AC #3) - stesso
    // principio di salvaEmailSegreteriaAction.
    await salvaUrlPaginaFacebook(valore || null);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare la Pagina Facebook. Riprova.",
      },
    };
  }

  revalidatePath("/app/impostazioni");
  return { success: true };
}

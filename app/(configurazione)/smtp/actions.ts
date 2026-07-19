"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import {
  leggiConfigurazioneSmtp,
  salvaConfigurazioneSmtp,
} from "@/lib/db-rls/configurazione-smtp";
import { inviaEmail } from "@/lib/email/invia-email";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type ConfigurazioneSmtpActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Controllo di formato minimale (non RFC 5322 completo, coerente con
// l'unico altro controllo email di questo progetto lato server) - review
// fix: prima nessun controllo di formato, solo "non vuoto".
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Review fix: Number("1e2") e' un intero valido (100) ma non e' cio' che un
// Admin che digita "1e2" per errore si aspetta - un controllo sulla forma
// della stringa (solo cifre) prima della conversione evita di accettare
// notazione scientifica/esadecimale/altre forme numeriche sorprendenti.
function eUnaPortaValida(portaGrezza: string): boolean {
  if (!/^\d+$/.test(portaGrezza)) return false;
  const porta = Number(portaGrezza);
  return porta >= 1 && porta <= 65535;
}

// AC #1/#5: solo Admin. Password obbligatoria solo al primo salvataggio
// (Prerequisito #3 della storia) - richiede leggere lo stato esistente
// prima di validare, non solo affidarsi a salvaConfigurazioneSmtp.
export async function salvaConfigurazione(
  _prevState: ConfigurazioneSmtpActionState,
  formData: FormData
): Promise<ConfigurazioneSmtpActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const host = String(formData.get("host") ?? "").trim();
  const portaGrezza = String(formData.get("porta") ?? "").trim();
  const sicura = formData.get("sicura") === "on";
  const utente = String(formData.get("utente") ?? "").trim();
  // Review fix: una password di soli spazi era truthy (superava il
  // controllo "obbligatoria" sotto) ma inutilizzabile - trim prima di
  // qualunque controllo/uso, non solo sui campi testuali generici sopra.
  const password = String(formData.get("password") ?? "").trim();
  const mittente = String(formData.get("mittente") ?? "").trim();
  const nomeMittenteGrezzo = String(formData.get("nomeMittente") ?? "").trim();
  const nomeMittente = nomeMittenteGrezzo || null;

  if (!host || !utente || !mittente) {
    return {
      error: {
        code: "VALIDATION",
        message: "Host, utente e mittente sono obbligatori.",
      },
    };
  }

  if (!FORMATO_EMAIL.test(mittente)) {
    return {
      error: {
        code: "VALIDATION",
        message: "L'indirizzo mittente non è un'email valida.",
      },
    };
  }

  if (!eUnaPortaValida(portaGrezza)) {
    return {
      error: {
        code: "VALIDATION",
        message: "La porta deve essere un numero tra 1 e 65535.",
      },
    };
  }
  const porta = Number(portaGrezza);

  const supabase = await createClient();

  try {
    const esistente = await leggiConfigurazioneSmtp(supabase);
    if (!esistente && !password) {
      return {
        error: {
          code: "VALIDATION",
          message: "La password è obbligatoria per la prima configurazione.",
        },
      };
    }

    await salvaConfigurazioneSmtp(supabase, {
      host,
      porta,
      sicura,
      utente,
      password,
      mittente,
      nomeMittente,
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare la configurazione. Riprova.",
      },
    };
  }

  revalidatePath("/smtp");
  return { success: true };
}

// AC #3/#4: verifica end-to-end che i parametri salvati funzionino davvero,
// prima che una funzionalita' automatica (Story 4.3+) faccia affidamento su
// di essi. Il messaggio "CONFIGURAZIONE_SMTP_MANCANTE" (lib/email/invia-email.ts)
// e' distinto da ogni altro fallimento di invio, cosi' l'Admin vede un
// messaggio diverso a seconda della causa.
export async function inviaEmailDiProva(
  _prevState: ConfigurazioneSmtpActionState,
  formData: FormData
): Promise<ConfigurazioneSmtpActionState> {
  const forbidden = await requireRuolo("ADMIN");
  if (forbidden) return forbidden;

  const destinatario = String(formData.get("destinatario") ?? "").trim();
  if (!destinatario) {
    return {
      error: { code: "VALIDATION", message: "Indirizzo destinatario obbligatorio." },
    };
  }
  if (!FORMATO_EMAIL.test(destinatario)) {
    return {
      error: {
        code: "VALIDATION",
        message: "L'indirizzo destinatario non è un'email valida.",
      },
    };
  }

  try {
    await inviaEmail({
      destinatario,
      oggetto: "Email di prova",
      testo: "Questa è un'email di prova per verificare la configurazione SMTP.",
    });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message.startsWith("CONFIGURAZIONE_SMTP_MANCANTE")) {
      return {
        error: { code: "VALIDATION", message: "Configurazione email non impostata." },
      };
    }
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile inviare l'email di prova. Verifica i parametri.",
      },
    };
  }

  return { success: true };
}

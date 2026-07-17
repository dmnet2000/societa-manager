"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione (non usato qui: login/registrazione non fanno controlli
// di autorizzazione, solo autenticazione/validazione).
export type AccediState =
  | { error: { code: string; message: string } }
  | undefined;

export async function accedi(
  _prevState: AccediState,
  formData: FormData
): Promise<AccediState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: {
        code: "VALIDATION",
        message: "Email e password sono obbligatorie.",
      },
    };
  }

  const supabase = await createClient();

  let data, error;
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    };
  }

  // AC #3: messaggio di errore chiaro su credenziali errate, nessun crash.
  if (error || !data.user) {
    return {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Credenziali non valide. Riprova.",
      },
    };
  }

  // Story 1.2 AC #3: un utente disattivato non puo' piu' accedere. Il
  // controllo avviene qui (login), non nel Proxy - vedi Dev Notes della
  // story 1.2 sul perche' "attivo" non e' specchiato in app_metadata come i
  // Ruoli (AD-11). Fail-closed: se il controllo stesso fallisce, o se non
  // esiste alcun Utente corrispondente (es. registrazione mai completata
  // fino in fondo - vedi Story 1.1/1.2 Review Findings), tratta come se non
  // si potesse accedere invece di lasciar passare senza verifica.
  try {
    const utente = await prisma.utente.findUnique({
      where: { supabaseAuthId: data.user.id },
      select: { attivo: true },
    });

    if (!utente || !utente.attivo) {
      await supabase.auth.signOut().catch(() => {});
      return {
        error: {
          code: "ACCOUNT_DISATTIVATO",
          message: "Account disattivato. Contatta la segreteria.",
        },
      };
    }
  } catch (err) {
    console.error(err);
    await supabase.auth.signOut().catch(() => {});
    return {
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    };
  }

  redirect("/");
}

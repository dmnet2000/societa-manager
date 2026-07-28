"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validaNuovaPassword } from "@/lib/auth/validazione-password";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
// A differenza di modificaPassword, il successo qui naviga via (redirect
// verso /accedi) - il token e' mono-uso e la pagina non serve piu' una volta
// consumato, stesso principio "successo = navighi via" di accedi/registrati.
export type ReimpostaPasswordState =
  | { error: { code: string; message: string } }
  | undefined;

// tokenHash arriva legato (bind) dal Client Component, letto dal Server
// Component genitore da searchParams - mai un campo del form (l'Utente non
// deve poterlo modificare).
export async function reimpostaPassword(
  tokenHash: string,
  _prevState: ReimpostaPasswordState,
  formData: FormData
): Promise<ReimpostaPasswordState> {
  const nuovaPassword = String(formData.get("nuovaPassword") ?? "");
  const confermaPassword = String(formData.get("confermaPassword") ?? "");

  // I/O Matrix: nessuna chiamata a Supabase se la validazione fallisce -
  // stesso helper condiviso di app/modifica-password/actions.ts.
  const erroreValidazione = validaNuovaPassword(nuovaPassword, confermaPassword);
  if (erroreValidazione) {
    return { error: erroreValidazione };
  }

  const ERRORE_TOKEN = {
    code: "TOKEN_NON_VALIDO",
    message: "Link di recupero non valido o scaduto. Richiedine uno nuovo.",
  };

  if (!tokenHash) {
    return { error: ERRORE_TOKEN };
  }

  const supabase = await createClient();

  // AC #6: scaduto/invalido/gia' consumato sono tutti trattati allo stesso
  // modo verso il chiamante (nessun dettaglio che riveli l'esistenza
  // dell'account sottostante) - il dettaglio reale va solo nei log server.
  let verifyError;
  let supabaseAuthId: string | undefined;
  try {
    const { data, error: e } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    verifyError = e;
    supabaseAuthId = data?.user?.id;
  } catch (err) {
    console.error("[reimpostaPassword] verifyOtp ha lanciato un'eccezione", err);
    return { error: ERRORE_TOKEN };
  }

  if (verifyError || !supabaseAuthId) {
    console.error("[reimpostaPassword] verifyOtp fallito", verifyError);
    return { error: ERRORE_TOKEN };
  }

  // Review fix (code review Story 9.11, Blind Hunter): senza questo, un
  // account disattivato (Utente.attivo = false, Story 1.2) potrebbe comunque
  // reimpostare la propria password tramite questo flusso self-service,
  // incoerente col controllo gia' esplicito al login (accedi/actions.ts).
  // Non blocca l'accesso di per se' (il login lo verifica comunque a parte),
  // ma evita di lasciare una sessione stabilita su un account disattivato.
  try {
    const utente = await prisma.utente.findUnique({
      where: { supabaseAuthId },
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
    console.error("[reimpostaPassword] controllo attivo fallito", err);
    await supabase.auth.signOut().catch(() => {});
    return {
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    };
  }

  // verifyOtp ha stabilito la sessione (cookie scritti dall'adapter di
  // lib/supabase/server.ts) - stesso identico secondo passo gia' presente in
  // app/modifica-password/actions.ts.
  let updateError;
  try {
    ({ error: updateError } = await supabase.auth.updateUser({
      password: nuovaPassword,
    }));
  } catch (err) {
    console.error("[reimpostaPassword] updateUser ha lanciato un'eccezione", err);
    return {
      error: { code: "AUTH_ERROR", message: "Impossibile aggiornare la password. Riprova." },
    };
  }

  if (updateError) {
    console.error(updateError);
    return {
      error: { code: "AUTH_ERROR", message: "Impossibile aggiornare la password. Riprova." },
    };
  }

  redirect("/accedi");
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
// Story 11.4: mirror quasi 1:1 di reimpostaPassword
// (app/(auth)/reimposta-password/actions.ts) - stesso schema tokenHash
// bind(null, ...) dal Client Component, type "signup" invece di "recovery",
// nessun blocco updateUser (non c'e' nulla da aggiornare qui).
export type ConfermaRegistrazioneState =
  | { error: { code: string; message: string } }
  | undefined;

// tokenHash arriva legato (bind) dal Client Component, letto dal Server
// Component genitore da searchParams - mai un campo del form (l'Utente non
// deve poterlo modificare).
export async function confermaRegistrazione(
  tokenHash: string,
  _prevState: ConfermaRegistrazioneState,
  _formData: FormData
): Promise<ConfermaRegistrazioneState> {
  const ERRORE_TOKEN = {
    code: "TOKEN_NON_VALIDO",
    message: "Link di conferma non valido o scaduto. Registrati di nuovo.",
  };

  if (!tokenHash) {
    return { error: ERRORE_TOKEN };
  }

  // createClient() (non createAdminClient()): a differenza di generateLink
  // in registrati/actions.ts (che crea il token, service-role, mai
  // esposto), qui verifyOtp DEVE scrivere i cookie di sessione tramite
  // l'adapter di lib/supabase/server.ts - e per farlo deve girare dentro
  // una Server Action (non un Server Component: vedi Dev Notes della
  // storia, setAll ignora silenziosamente l'errore altrimenti).
  const supabase = await createClient();

  let verifyError;
  try {
    const { error: e } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });
    verifyError = e;
  } catch (err) {
    console.error("[confermaRegistrazione] verifyOtp ha lanciato un'eccezione", err);
    return { error: ERRORE_TOKEN };
  }

  if (verifyError) {
    console.error("[confermaRegistrazione] verifyOtp fallito", verifyError);
    return { error: ERRORE_TOKEN };
  }

  // verifyOtp ha stabilito la sessione (cookie scritti dall'adapter di
  // lib/supabase/server.ts) - i record Utente/Ruoli/aggancio sono gia'
  // stati creati in registrati() prima dell'invio dell'email, nessun altro
  // lavoro da fare qui.
  redirect("/app");
}

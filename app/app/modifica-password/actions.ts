"use server";

import { createClient } from "@/lib/supabase/server";
import { validaNuovaPassword } from "@/lib/auth/validazione-password";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione (non usato qui: la sola sessione basta, nessun controllo
// di Ruolo su questa Server Action - la protezione di /modifica-password è
// già applicata a monte da route-guard.ts). A differenza di accedi/registrati
// (che finiscono con un redirect), qui il successo resta sulla stessa pagina
// con un messaggio - niente da navigare via, l'Utente potrebbe voler
// aggiornare di nuovo la password nella stessa sessione di lavoro.
// I due rami condividono entrambe le chiavi (opzionali) cosi' il Client
// Component puo' leggere `state?.error`/`state?.successo` senza dover prima
// restringere l'unione con un "in" - stesso identico bisogno di
// AccediState/RegistrazioneState, che pero' non hanno un ramo di successo
// diverso da "redirect" e quindi non incontrano questo problema.
export type ModificaPasswordState =
  | { successo: true; error?: undefined }
  | { successo?: undefined; error: { code: string; message: string } }
  | undefined;

export async function modificaPassword(
  _prevState: ModificaPasswordState,
  formData: FormData
): Promise<ModificaPasswordState> {
  const nuovaPassword = String(formData.get("nuovaPassword") ?? "");
  const confermaPassword = String(formData.get("confermaPassword") ?? "");

  // I/O Matrix: nessuna chiamata a Supabase se la validazione fallisce.
  // Story 9.11: validazione estratta in lib/auth/validazione-password.ts
  // (riusata anche da app/(auth)/reimposta-password/actions.ts) - stessi
  // vincoli gia' scoperti in code review della Story 9.4 (min 8 su contenuto
  // trim, max 72 byte per il troncamento silenzioso di bcrypt).
  const erroreValidazione = validaNuovaPassword(nuovaPassword, confermaPassword);
  if (erroreValidazione) {
    return { error: erroreValidazione };
  }

  const supabase = await createClient();

  let error;
  try {
    ({ error } = await supabase.auth.updateUser({ password: nuovaPassword }));
  } catch (err) {
    console.error("[modificaPassword] updateUser ha lanciato un'eccezione", err);
    return {
      error: {
        code: "AUTH_ERROR",
        message: "Impossibile aggiornare la password. Riprova.",
      },
    };
  }

  // I/O Matrix "Errore Supabase (es. sessione scaduta)": il form resta
  // compilabile, nessun redirect - a differenza di esci()/accedi(), un
  // fallimento qui non deve far perdere la sessione corrente dell'Utente.
  if (error) {
    console.error(error);
    return {
      error: {
        code: "AUTH_ERROR",
        message: "Impossibile aggiornare la password. Riprova.",
      },
    };
  }

  return { successo: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";

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
  // Review fix (code review Story 9.4, Edge Case Hunter): la lunghezza va
  // controllata sul contenuto reale (trim), non sul conteggio grezzo dei
  // caratteri - altrimenti una password di soli spazi ("        ") supera
  // il controllo "almeno 8 caratteri" pur non essendo una password reale.
  if (nuovaPassword.trim().length < 8) {
    return {
      error: {
        code: "VALIDATION",
        message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
      },
    };
  }

  // Review fix (code review Story 9.4, Blind Hunter + Edge Case Hunter,
  // trovato da entrambi): bcrypt e derivati (usati da Supabase Auth)
  // ignorano/troncano silenziosamente oltre 72 byte - senza questo limite
  // l'Utente potrebbe impostare una password che Supabase accetta ma
  // effettivamente confronta solo nei primi 72 byte, un comportamento
  // sorprendente e non segnalato.
  if (nuovaPassword.length > 72) {
    return {
      error: {
        code: "VALIDATION",
        message: "La nuova password non può superare i 72 caratteri.",
      },
    };
  }

  if (nuovaPassword !== confermaPassword) {
    return {
      error: {
        code: "VALIDATION",
        message: "La conferma non coincide con la nuova password.",
      },
    };
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

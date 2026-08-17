"use client";

import { useActionState } from "react";
import { confermaRegistrazione } from "./actions";
import styles from "./conferma-registrazione.module.css";

// Story 11.4: mirror ridotto di ReimpostaPasswordForm.tsx (stesso schema
// useActionState/bind del tokenHash) - nessun campo di testo, un solo
// bottone: qui non c'e' nulla da far scegliere all'Utente, solo confermare.
export function ConfermaRegistrazioneForm({ tokenHash }: { tokenHash: string }) {
  const [state, formAction, pending] = useActionState(
    confermaRegistrazione.bind(null, tokenHash),
    undefined
  );

  return (
    <form action={formAction} className={styles.form}>
      <p className={styles.testo}>
        Clicca il pulsante per completare la registrazione e accedere all&apos;app.
      </p>
      {state?.error && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Conferma registrazione
      </button>
    </form>
  );
}

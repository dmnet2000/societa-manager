"use client";

import { useActionState, useEffect, useRef } from "react";
import { modificaPassword } from "./actions";
import styles from "./modifica-password.module.css";

export function ModificaPasswordForm() {
  const [state, formAction, pending] = useActionState(modificaPassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Review fix (code review Story 9.4, Edge Case Hunter + Blind Hunter,
  // trovato da entrambi): senza questo, i campi restavano compilati con la
  // password appena impostata dopo un aggiornamento riuscito - stato "fatto"
  // incoerente per un form che resta volutamente sulla stessa pagina (vedi
  // commento sul redirect piu' sotto).
  useEffect(() => {
    if (state?.successo) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      <div className={styles.campo}>
        <label htmlFor="nuovaPassword">Nuova password</label>
        <input
          id="nuovaPassword"
          name="nuovaPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="confermaPassword">Conferma nuova password</label>
        <input
          id="confermaPassword"
          name="confermaPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {state?.error && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {/* Nessun redirect al successo (a differenza di accedi/registrati) -
          l'Utente resta sulla stessa pagina e vede la conferma qui, coerente
          con l'I/O Matrix della spec ("messaggio di successo", non un
          redirect). */}
      {state?.successo && (
        <p role="status" className={styles.successo}>
          Password aggiornata con successo.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Aggiorna password
      </button>
    </form>
  );
}

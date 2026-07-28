"use client";

import { useActionState } from "react";
import { reimpostaPassword } from "./actions";
import styles from "./reimposta-password.module.css";

export function ReimpostaPasswordForm({ tokenHash }: { tokenHash: string }) {
  const [state, formAction, pending] = useActionState(
    reimpostaPassword.bind(null, tokenHash),
    undefined
  );

  return (
    <form action={formAction} className={styles.form}>
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
      <button disabled={pending} type="submit" className={styles.bottone}>
        Reimposta password
      </button>
    </form>
  );
}

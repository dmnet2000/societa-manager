"use client";

import { useActionState } from "react";
import Link from "next/link";
import { richiediRecuperoPassword } from "./actions";
import styles from "./recupera-password.module.css";

export function RecuperaPasswordForm() {
  const [state, formAction, pending] = useActionState(
    richiediRecuperoPassword,
    undefined
  );

  return (
    <>
      <form action={formAction} className={styles.form}>
        <div className={styles.campo}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        {state?.error && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        {state?.successo && (
          <p role="status" className={styles.successo}>
            {state.messaggio}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Invia
        </button>
      </form>
      <p className={styles.link}>
        <Link href="/accedi">Torna al login</Link>
      </p>
    </>
  );
}

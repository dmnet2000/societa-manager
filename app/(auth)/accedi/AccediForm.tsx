"use client";

import { useActionState } from "react";
import Link from "next/link";
import { accedi } from "./actions";
import styles from "./accedi.module.css";

export function AccediForm() {
  const [state, formAction, pending] = useActionState(accedi, undefined);

  return (
    <>
      <form action={formAction} className={styles.form}>
        <div className={styles.campo}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        {state?.error && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Accedi
        </button>
      </form>
      <p className={styles.link}>
        Non hai un account? <Link href="/registrati">Registrati</Link>
      </p>
    </>
  );
}

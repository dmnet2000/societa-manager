"use client";

import { useActionState } from "react";
import { salvaEmailSegreteriaAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 9.31: mirror 1:1 di NomeSettoreForm.tsx (app/(configurazione)/logo/).
export function EmailSegreteriaForm({ emailAttuale }: { emailAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaEmailSegreteriaAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="email-segreteria">Email Segreteria</label>
        <input
          id="email-segreteria"
          name="emailSegreteria"
          type="email"
          maxLength={254}
          defaultValue={emailAttuale ?? ""}
          placeholder="es. segreteria@miasocieta.it"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Email Segreteria salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

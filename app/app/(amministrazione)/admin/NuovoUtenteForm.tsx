"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaUtente } from "./actions";
import styles from "./admin.module.css";

const RUOLI = [
  { value: "ALLENATORE", label: "Allenatore" },
  { value: "ATLETA", label: "Atleta" },
  { value: "GENITORE", label: "Genitore" },
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
  { value: "ADMIN", label: "Admin" },
];

export function NuovoUtenteForm() {
  const [state, formAction, pending] = useActionState(creaUtente, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuovo-utente-email">Email</label>
        <input
          id="nuovo-utente-email"
          name="email"
          type="email"
          autoComplete="off"
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-utente-password">Password</label>
        <input
          id="nuovo-utente-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <fieldset className={styles.fieldset}>
        <legend>Ruolo (uno o più)</legend>
        {RUOLI.map((ruolo) => (
          <label key={ruolo.value} className={styles.checkboxRuolo}>
            <input type="checkbox" name="ruoli" value={ruolo.value} />
            {ruolo.label}
          </label>
        ))}
      </fieldset>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Utente creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea utente
      </button>
    </form>
  );
}

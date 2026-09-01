"use client";

import { useActionState, useEffect, useRef } from "react";
import { precaricaRuolo } from "./actions";
import styles from "./precaricamento-ruoli.module.css";

// Story 9.41: le uniche due checkbox gestite da questa pagina - stesse
// etichette italiane di NuovoUtenteForm.tsx/UtenteRow.tsx (coerenza col
// resto del prodotto).
const RUOLI = [
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
];

export function NuovoPrecaricamentoRuoloForm() {
  const [state, formAction, pending] = useActionState(precaricaRuolo, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      <div className={styles.campo}>
        <label htmlFor="precarica-ruolo-email">Email</label>
        <input id="precarica-ruolo-email" name="email" type="email" required />
      </div>
      <fieldset className={styles.fieldset}>
        <legend>Ruolo (almeno uno)</legend>
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
          Email precaricata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Precarica
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaPalestra } from "./actions";
import styles from "./palestre.module.css";

export function NuovaPalestraForm() {
  const [state, formAction, pending] = useActionState(creaPalestra, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuova-palestra-nome">Nome</label>
        <input id="nuova-palestra-nome" name="nome" type="text" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuova-palestra-indirizzo">Indirizzo</label>
        <input id="nuova-palestra-indirizzo" name="indirizzo" type="text" />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Palestra creata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Palestra
      </button>
    </form>
  );
}

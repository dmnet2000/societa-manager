"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaEdizioneTorneoAction } from "./actions";
import styles from "./torneo.module.css";

// Story 20.1 (Epic 20, Torneo Memorial): mirror di NuovoSlotForm.tsx
// (app/(orari-palestre)/slot) - form di creazione a campo singolo, reset
// automatico dopo un salvataggio riuscito.
export function NuovaEdizioneTorneoForm() {
  const [state, formAction, pending] = useActionState(creaEdizioneTorneoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campiRiga}>
        <div className={styles.campo}>
          <label htmlFor="nuova-edizione-anno">Anno</label>
          <input
            id="nuova-edizione-anno"
            name="anno"
            type="number"
            inputMode="numeric"
            step="1"
            min={2000}
            max={2100}
            required
          />
        </div>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Edizione creata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Edizione
      </button>
    </form>
  );
}

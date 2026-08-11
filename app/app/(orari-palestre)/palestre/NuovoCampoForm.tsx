"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaCampo } from "./actions";
import styles from "./palestre.module.css";

export function NuovoCampoForm({ palestraId }: { palestraId: string }) {
  const [state, formAction, pending] = useActionState(creaCampo, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="palestraId" value={palestraId} />
      <div className={styles.campo}>
        <label htmlFor={`nuovo-campo-nome-${palestraId}`}>Nuovo Campo</label>
        <input
          id={`nuovo-campo-nome-${palestraId}`}
          name="nome"
          type="text"
          required
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Aggiungi Campo
      </button>
    </form>
  );
}

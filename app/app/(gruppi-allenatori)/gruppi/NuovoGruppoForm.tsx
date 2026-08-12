"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaGruppo } from "./actions";
import styles from "./gruppi.module.css";

export function NuovoGruppoForm() {
  const [state, formAction, pending] = useActionState(creaGruppo, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuovo-gruppo-nome">Nome</label>
        <input id="nuovo-gruppo-nome" name="nome" type="text" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-gruppo-categoria">Categoria</label>
        <input id="nuovo-gruppo-categoria" name="categoria" type="text" required />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Gruppo creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Gruppo
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaUtenteTablet } from "./actions";
import styles from "./admin.module.css";

// Referto elettronico (AD-12): l'utente dedicato a un tablet si crea col solo
// nome e una password - l'email e' ricavata dal nome lato server, il tablet
// entra solo dall'app (mai nel sito).
export function NuovoTabletForm() {
  const [state, formAction, pending] = useActionState(creaUtenteTablet, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuovo-tablet-nome">Nome del tablet</label>
        <input
          id="nuovo-tablet-nome"
          name="nome"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={30}
          placeholder="es. campo1"
          aria-describedby="nuovo-tablet-nome-regola"
          required
        />
        <small id="nuovo-tablet-nome-regola">
          Da 3 a 30 caratteri: lettere senza accenti, cifre e trattino, iniziando con una
          lettera.
        </small>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-tablet-password">Password</label>
        <input
          id="nuovo-tablet-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Tablet creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea tablet
      </button>
    </form>
  );
}

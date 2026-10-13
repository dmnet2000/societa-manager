"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaFederazioneAction } from "./actions";
import styles from "./federazioni.module.css";

// Story 26.1: mirror strutturale di NuovaVoceMenuPubblicoForm.tsx - reset
// del form dopo un successo.
export function NuovaFederazioneForm() {
  const [state, formAction, pending] = useActionState(creaFederazioneAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuova-federazione-nome">Nome</label>
        <input
          id="nuova-federazione-nome"
          name="nome"
          type="text"
          maxLength={80}
          placeholder="es. Centro Sportivo Italiano"
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuova-federazione-sigla">Sigla (facoltativa)</label>
        <input
          id="nuova-federazione-sigla"
          name="sigla"
          type="text"
          maxLength={20}
          placeholder="es. CSI"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Federazione creata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Aggiungi federazione
      </button>
    </form>
  );
}

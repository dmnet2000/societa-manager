"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaFotoProfilo } from "./actions";
import styles from "./il-mio-profilo.module.css";

export function FotoProfiloForm({ tipo }: { tipo: "ATLETA" | "ALLENATORE" }) {
  const [state, formAction, pending] = useActionState(
    caricaFotoProfilo.bind(null, tipo),
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Stesso pattern di CaricaCertificatoForm.tsx/ModificaPasswordForm.tsx:
  // il form non deve continuare a mostrare il vecchio nome file dopo un
  // caricamento riuscito.
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      <div className={styles.campo}>
        <label htmlFor={`foto-profilo-file-${tipo}`}>
          Foto (JPG, PNG — max 5MB)
        </label>
        <input
          id={`foto-profilo-file-${tipo}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png"
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
          Foto caricata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Carica foto
      </button>
    </form>
  );
}

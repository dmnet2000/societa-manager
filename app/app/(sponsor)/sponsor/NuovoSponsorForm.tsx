"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaSponsor } from "./actions";
import styles from "./sponsor.module.css";

export function NuovoSponsorForm() {
  const [state, formAction, pending] = useActionState(creaSponsor, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuovo-sponsor-nome">Nome</label>
        <input id="nuovo-sponsor-nome" name="nome" type="text" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-sponsor-tipo">Tipo</label>
        <select id="nuovo-sponsor-tipo" name="tipo" defaultValue="BANNER" required>
          <option value="BANNER">Banner pubblicitario</option>
          <option value="CONVENZIONE">Convenzione</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-sponsor-descrizione">Descrizione</label>
        <textarea id="nuovo-sponsor-descrizione" name="descrizione" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-sponsor-link">Link esterno (opzionale)</label>
        <input id="nuovo-sponsor-link" name="linkEsterno" type="url" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-sponsor-file">Immagine (PNG o JPG, max 2MB)</label>
        <input
          id="nuovo-sponsor-file"
          name="file"
          type="file"
          accept=".png,.jpg,.jpeg"
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
          Sponsor creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Sponsor
      </button>
    </form>
  );
}

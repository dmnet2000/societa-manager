"use client";

import { useActionState } from "react";
import { salvaUrlSitoPolisportivaAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.20: mirror 1:1 di PaginaFacebookForm.tsx.
export function SitoPolisportivaForm({ urlAttuale }: { urlAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaUrlSitoPolisportivaAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="url-sito-polisportiva">URL sito Polisportiva</label>
        <input
          id="url-sito-polisportiva"
          name="urlSitoPolisportiva"
          type="url"
          maxLength={500}
          defaultValue={urlAttuale ?? ""}
          placeholder="es. https://www.polisportiva-esempio.it"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Sito Polisportiva salvato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

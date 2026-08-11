"use client";

import { useActionState } from "react";
import { salvaNomeSettoreAction } from "./actions";
import styles from "./logo.module.css";

export function NomeSettoreForm({ nomeSettoreAttuale }: { nomeSettoreAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaNomeSettoreAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nome-settore">Nome del settore</label>
        <input
          id="nome-settore"
          name="nomeSettore"
          type="text"
          maxLength={60}
          defaultValue={nomeSettoreAttuale ?? ""}
          placeholder="es. Volley"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Nome del settore salvato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

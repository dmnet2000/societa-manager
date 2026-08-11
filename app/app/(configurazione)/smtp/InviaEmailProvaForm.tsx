"use client";

import { useActionState } from "react";
import { inviaEmailDiProva } from "./actions";
import styles from "./smtp.module.css";

// AC #3: visibile solo se una configurazione esiste gia' (page.tsx decide),
// cosi' l'Admin puo' verificare che i parametri salvati funzionino davvero
// prima che una funzionalita' automatica (Story 4.3+) faccia affidamento su
// di essi.
export function InviaEmailProvaForm() {
  const [state, formAction, pending] = useActionState(
    inviaEmailDiProva,
    undefined
  );

  return (
    <form action={formAction}>
      <h2 className={styles.sottotitolo}>Invia email di prova</h2>
      <div className={styles.campo}>
        <label htmlFor="prova-destinatario">Destinatario</label>
        <input id="prova-destinatario" name="destinatario" type="email" required />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Email di prova inviata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Invia email di prova
      </button>
    </form>
  );
}

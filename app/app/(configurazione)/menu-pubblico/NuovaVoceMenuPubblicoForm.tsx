"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaVoceMenuPubblicoAction } from "./actions";
import styles from "./menu-pubblico.module.css";

// Story 19.7: mirror strutturale di NuovoSponsorForm.tsx (Story 16.1) - reset
// del form dopo un successo, stesso pattern.
export function NuovaVoceMenuPubblicoForm() {
  const [state, formAction, pending] = useActionState(
    creaVoceMenuPubblicoAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuova-voce-etichetta">Etichetta</label>
        <input id="nuova-voce-etichetta" name="etichetta" type="text" maxLength={40} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuova-voce-url">URL</label>
        {/* type="text" non type="url": il valore puo' essere una rotta
            interna del sito (es. "/squadre"), che la validazione browser di
            type="url" rifiuterebbe come non assoluta. */}
        <input
          id="nuova-voce-url"
          name="url"
          type="text"
          maxLength={200}
          placeholder="es. /squadre oppure https://..."
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
          Voce creata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Aggiungi voce
      </button>
    </form>
  );
}

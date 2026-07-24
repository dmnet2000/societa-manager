"use client";

import { useActionState } from "react";
import { inserisciMisurazioneAction } from "./actions";
import styles from "./dati-fisici.module.css";

export function MisurazioneForm({ atletaId }: { atletaId: string }) {
  const [state, formAction, pending] = useActionState(
    inserisciMisurazioneAction,
    undefined
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <div className={styles.campo}>
        <label>
          Tipo
          <input type="text" name="tipo" placeholder="es. Altezza" required />
        </label>
      </div>
      <div className={styles.campo}>
        <label>
          Valore
          <input type="text" name="valore" placeholder="es. 178" required />
        </label>
      </div>
      <div className={styles.campo}>
        <label>
          Unità di misura
          <input type="text" name="unitaMisura" placeholder="es. cm" required />
        </label>
      </div>
      <div className={styles.campo}>
        <label>
          Data
          <input type="date" name="data" required />
        </label>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Misurazione salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva misurazione
      </button>
    </form>
  );
}

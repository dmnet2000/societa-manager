"use client";

import { useActionState } from "react";
import { precaricaAllenatore } from "./actions";
import styles from "./precaricamento-allenatori.module.css";

export default function PrecaricamentoAllenatoriPage() {
  const [state, formAction, pending] = useActionState(
    precaricaAllenatore,
    undefined
  );

  return (
    <main>
      <h1>Precaricamento Allenatori</h1>
      <form action={formAction} className={styles.form}>
        <div className={styles.campo}>
          <label htmlFor="precarica-nome">Nome</label>
          <input id="precarica-nome" name="nome" type="text" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="precarica-cf">Codice Fiscale</label>
          <input
            id="precarica-cf"
            name="codiceFiscale"
            type="text"
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
            Allenatore precaricato.
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Precarica
        </button>
      </form>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { precaricaAllenatore } from "./actions";
import styles from "./precaricamento-allenatori.module.css";

// Story 9.9: form estratto da page.tsx (che diventa un Server Component per
// poter interrogare l'elenco Allenatori) - contenuto/comportamento invariati
// rispetto a prima, stesso pattern di NuovaPalestraForm.tsx.
export function NuovoAllenatoreForm() {
  const [state, formAction, pending] = useActionState(
    precaricaAllenatore,
    undefined
  );

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.campo}>
        <label htmlFor="precarica-nome">Nome</label>
        <input id="precarica-nome" name="nome" type="text" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="precarica-cognome">Cognome</label>
        <input id="precarica-cognome" name="cognome" type="text" required />
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
  );
}

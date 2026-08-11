"use client";

import { useActionState } from "react";
import { importaAtlete } from "./actions";
import styles from "./import-atlete.module.css";

// Story 17.2: estratto da page.tsx (che era interamente "use client") per
// poter risolvere i Ruoli lato server e mostrare l'aiuto contestuale -
// stesso principio gia' in uso ovunque nel progetto (page.tsx Server
// Component + form Client Component, es. NuovaPalestraForm.tsx).
export function ImportAtleteForm() {
  const [state, formAction, pending] = useActionState(importaAtlete, undefined);

  return (
    <>
      <form action={formAction} className={styles.form}>
        <div className={styles.campo}>
          <label htmlFor="import-atlete-file">File Excel export federale</label>
          <input
            id="import-atlete-file"
            name="file"
            type="file"
            accept=".xlsx"
            required
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Importa
        </button>
      </form>

      {state && "success" in state && (
        <section role="status" className={styles.riepilogo}>
          <h2>Riepilogo import</h2>
          <p>Atlete create: {state.create}</p>
          <p>Atlete aggiornate: {state.aggiornate}</p>
          <p>Atlete riportate (Under 13): {state.riportate}</p>
          <p>Righe scartate: {state.scartate.length}</p>
          {state.scartate.length > 0 && (
            <ul className={styles.scartate}>
              {state.scartate.map((riga) => (
                <li key={riga.numeroRiga}>
                  Riga {riga.numeroRiga}: {riga.motivo}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

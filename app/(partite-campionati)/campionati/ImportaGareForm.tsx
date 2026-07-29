"use client";

import { useActionState, useEffect, useRef } from "react";
import { importaGare } from "./importa-gare-actions";
import styles from "./campionati.module.css";

// Stesso pattern di NuovoCampionatoForm/CollegaCampionatoForm (Story 10.1):
// gruppoId/campionatoId passati come campi hidden, autorizzazione/possesso
// verificati comunque lato server in importaGare.
export function ImportaGareForm({
  gruppoId,
  campionatoId,
}: {
  gruppoId: string;
  campionatoId: string;
}) {
  const [state, formAction, pending] = useActionState(importaGare, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  const inputId = `importa-gare-file-${gruppoId}-${campionatoId}`;

  return (
    <form ref={formRef} action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="gruppoId" value={gruppoId} />
      <input type="hidden" name="campionatoId" value={campionatoId} />
      <label htmlFor={inputId}>Importa gare (Excel)</label>
      <input id={inputId} name="file" type="file" accept=".xls,.xlsx" required />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        Importa
      </button>

      {state && "success" in state && (
        <section role="status" className={styles.riepilogoCompatto}>
          <p>Partite create: {state.create}</p>
          <p>Partite aggiornate: {state.aggiornate}</p>
          <p>Righe scartate: {state.scartate.length}</p>
          {state.scartate.length > 0 && (
            <ul className={styles.scartateCompatto}>
              {state.scartate.map((riga) => (
                <li key={riga.numeroRiga}>
                  Riga {riga.numeroRiga}: {riga.motivo}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}

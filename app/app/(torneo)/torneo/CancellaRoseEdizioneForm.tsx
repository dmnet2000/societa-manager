"use client";

import { useActionState } from "react";
import { cancellaRoseEdizioneAction } from "./actions";
import styles from "./torneo.module.css";

// Story 3.13 (AD-4): cancellazione delle rose dell'Edizione, solo Admin.
// Stesso schema di EliminaEdizioneTorneoForm: window.confirm prima
// dell'invio; l'autorizzazione vera e' nell'azione e nel database.
export function CancellaRoseEdizioneForm({
  edizioneId,
  nome,
  anno,
}: {
  edizioneId: string;
  nome: string;
  anno: number;
}) {
  const [state, formAction, pending] = useActionState(cancellaRoseEdizioneAction, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Cancellare tutte le rose dell'Edizione "${nome}" ${anno}? L'operazione non è reversibile.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="edizioneTorneoId" value={edizioneId} />
      <button disabled={pending} type="submit" className={styles.bottoneSecondario}>
        Cancella le rose dell&apos;Edizione
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && <p role="status">{state.messaggio}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { cancellaPartita } from "./actions";
import styles from "./partite.module.css";

// Story 10.6: stesso pattern esatto di AtletaAssegnata.tsx (Story 9.14) -
// conferma esplicita window.confirm prima dell'invio, bottone disabilitato
// durante pending, errore mostrato con role="alert".
export function EliminaPartitaForm({
  partitaId,
  squadraCasa,
  squadraOspite,
  data,
}: {
  partitaId: string;
  squadraCasa: string;
  squadraOspite: string;
  data: string;
}) {
  const [state, formAction, pending] = useActionState(cancellaPartita, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Cancellare la Partita ${squadraCasa} - ${squadraOspite} del ${data}?`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="partitaId" value={partitaId} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneElimina}
        aria-label={`Cancella la Partita ${squadraCasa} - ${squadraOspite} del ${data}`}
      >
        Cancella
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </form>
  );
}

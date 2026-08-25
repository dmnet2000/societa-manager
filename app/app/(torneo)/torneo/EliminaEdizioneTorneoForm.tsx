"use client";

import { useActionState } from "react";
import { cancellaEdizioneTorneoAction } from "./actions";
import styles from "./torneo.module.css";

// Story 20.1 (Epic 20, Torneo Memorial): mirror di EliminaCampionatoForm.tsx
// (app/(partite-campionati)/campionati) - conferma esplicita window.confirm
// prima dell'invio, bottone disabilitato durante pending, errore mostrato
// con role="alert" (la guardia vera - Edizione con Categorie collegate -
// resta nella Server Action, questo e' solo un secondo avviso lato client).
export function EliminaEdizioneTorneoForm({
  edizioneId,
  anno,
}: {
  edizioneId: string;
  anno: number;
}) {
  const [state, formAction, pending] = useActionState(
    cancellaEdizioneTorneoAction,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Cancellare l'Edizione ${anno}? L'operazione non è reversibile.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={edizioneId} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneSecondario}
        aria-label={`Cancella l'Edizione ${anno}`}
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

"use client";

import { useActionState } from "react";
import { cancellaCampionato } from "./actions";
import styles from "./campionati.module.css";

// Story 10.6: stesso pattern esatto di AtletaAssegnata.tsx (Story 9.14) -
// conferma esplicita window.confirm prima dell'invio, bottone disabilitato
// durante pending, errore mostrato con role="alert".
export function EliminaCampionatoForm({
  campionatoId,
  nome,
}: {
  campionatoId: string;
  nome: string;
}) {
  const [state, formAction, pending] = useActionState(cancellaCampionato, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Cancellare il Campionato ${nome}? Tutte le Partite collegate verranno rimosse.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="campionatoId" value={campionatoId} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneElimina}
        aria-label={`Cancella il Campionato ${nome}`}
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

"use client";

import { useActionState } from "react";
import { eliminaPaginaPubblicaAction } from "./actions";
import styles from "./pagine-pubbliche.module.css";

// Story 19.10: hard delete (nessuno stato "bozza"/soft-delete per
// PaginaPubblica, deciso in party mode - vedi spec-19-10, sezione Never) -
// mirror strutturale di EliminaCampionatoForm.tsx (Story 10.6): conferma
// esplicita window.confirm prima dell'invio, bottone disabilitato durante
// pending, errore mostrato con role="alert".
export function EliminaPaginaPubblicaForm({ id, titolo }: { id: string; titolo: string }) {
  const [state, formAction, pending] = useActionState(eliminaPaginaPubblicaAction, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Eliminare la Pagina "${titolo}"? L'URL tornerà a mostrare una pagina non trovata.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneElimina}
        aria-label={`Elimina la Pagina ${titolo}`}
      >
        Elimina
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </form>
  );
}

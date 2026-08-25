"use client";

import { useActionState } from "react";
import { generaCalendarioGironiAction } from "../../../actions";
import styles from "../../../torneo.module.css";

// Story 20.3 (Epic 20, Torneo Memorial): mirror di EliminaEdizioneTorneoForm.tsx
// (app/app/(torneo)/torneo) - form di una singola azione (nessun campo
// utente, solo la Categoria come hidden field), errore mostrato con
// role="alert". Nessuna conferma window.confirm: a differenza di una
// cancellazione, generare il calendario e' un'azione additiva, non
// distruttiva (spec-20-3 Boundaries: rifiutata esplicitamente se gia'
// generata, mai un secondo tentativo silenzioso).
export function GeneraCalendarioGironiForm({
  categoriaTorneoId,
}: {
  categoriaTorneoId: string;
}) {
  const [state, formAction, pending] = useActionState(generaCalendarioGironiAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Genera calendario
      </button>
    </form>
  );
}

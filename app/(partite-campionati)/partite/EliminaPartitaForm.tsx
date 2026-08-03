"use client";

import styles from "./partite.module.css";
import type { PartitaActionState } from "./actions";

// Story 10.6: stesso pattern esatto di AtletaAssegnata.tsx (Story 9.14) -
// conferma esplicita window.confirm prima dell'invio, bottone disabilitato
// durante pending, errore mostrato con role="alert".
//
// Review fix (code review Story 10.4): non possiede piu' il proprio
// useActionState - state/action/disabled sono ora sollevati in PartitaRow
// (stesso identico principio di SlotRow.tsx, Story 9.13:
// azionePending = modificaPending || cancellaPending) cosi' che Cancella
// possa essere disabilitato mentre una modifica e' aperta/in corso sulla
// stessa riga, ed evitare una cancellazione concorrente a un salvataggio.
export function EliminaPartitaForm({
  partitaId,
  squadraCasa,
  squadraOspite,
  data,
  action,
  state,
  disabled,
}: {
  partitaId: string;
  squadraCasa: string;
  squadraOspite: string;
  data: string;
  action: (formData: FormData) => void;
  state: PartitaActionState;
  disabled: boolean;
}) {
  return (
    <form
      action={action}
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
        disabled={disabled}
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

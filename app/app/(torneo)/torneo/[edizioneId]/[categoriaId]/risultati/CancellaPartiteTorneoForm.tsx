"use client";

import { useActionState } from "react";
import { cancellaPartiteTorneoAction } from "../../../actions";
import styles from "../../../torneo.module.css";

// Story 20.8 (Epic 20, Torneo Memorial): mirror di EliminaEdizioneTorneoForm.tsx
// (conferma esplicita window.confirm prima dell'invio, bottone disabilitato
// durante pending, errore mostrato con role="alert") - qui l'operazione
// cancella TUTTE le partite di una Categoria in un colpo solo (qualunque
// fase/tabellone presenti), riportandola allo stato "calendario non ancora
// generato". Review fix (Blind Hunter, 3 punti convergenti):
// 1) .bottoneDanger (non .bottoneSecondario) - un'azione che puo' cancellare
//    decine di partite e classifiche intere non deve avere lo stesso stile
//    grigio neutro di un "Annulla" innocuo.
// 2) numeroPartite mostrato prima della conferma - l'utente sapeva solo che
//    "tutte" sarebbero state cancellate, mai quante.
// 3) testo di conferma esplicito sulla perdita di risultati/classifiche gia'
//    inseriti, non solo "il calendario va rigenerato" (che minimizzava
//    l'impatto reale). Rimosso anche il riferimento fisso a "girone e
//    tabellone": una Categoria puo' teoricamente avere solo partite di
//    un tipo, il testo ora resta corretto in ogni composizione.
export function CancellaPartiteTorneoForm({
  categoriaTorneoId,
  categoriaNome,
  numeroPartite,
}: {
  categoriaTorneoId: string;
  categoriaNome: string;
  numeroPartite: number;
}) {
  const [state, formAction, pending] = useActionState(
    cancellaPartiteTorneoAction,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Cancellare tutte le ${numeroPartite} partite della Categoria "${categoriaNome}"? Verranno persi anche tutti i risultati e le classifiche già calcolate - l'operazione non è reversibile, il calendario tornerà a dover essere generato da capo.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneDanger}
        aria-label={`Cancella tutte le ${numeroPartite} partite della Categoria ${categoriaNome}`}
      >
        Cancella tutte le partite ({numeroPartite})
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </form>
  );
}

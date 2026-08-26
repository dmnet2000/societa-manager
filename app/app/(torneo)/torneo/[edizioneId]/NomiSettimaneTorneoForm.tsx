"use client";

import { useActionState } from "react";
import { aggiornaNomiSettimaneAction } from "../actions";
import { NOME_SETTIMANA_MAX } from "@/lib/settimana-torneo";
import styles from "../torneo.module.css";

// Story 20.13 (Epic 20, Torneo Memorial): mirror di VolantinoTorneoForm.tsx
// (stesso useActionState, stessi styles.formCompatto/formInline/
// bottoneCompatto) - qui pero' due campi di testo facoltativi invece di un
// upload file, entrambi con fallback sull'etichetta generica esistente se
// lasciati vuoti (spec-20-13 I/O matrix).
//
// Review fix (Blind Hunter): un `<input defaultValue={...}>` non controllato
// non ripropaga un nuovo defaultValue su un semplice re-render (comportamento
// React standard) - dopo un salvataggio riuscito con revalidatePath, i props
// nomeSettimana1/2 arrivano aggiornati (es. trimmati) ma l'input montato
// continuerebbe a mostrare il testo grezzo digitato dall'Admin. La `key`
// sotto forza React a smontare/rimontare i due input quando i valori salvati
// cambiano davvero, stesso principio "unmount per rinfrescare un
// defaultValue" gia' usato altrove nel modulo (CategoriaTorneoRow.tsx, il
// form di modifica si smonta interamente al successo).
export function NomiSettimaneTorneoForm({
  edizioneTorneoId,
  nomeSettimana1,
  nomeSettimana2,
}: {
  edizioneTorneoId: string;
  nomeSettimana1: string | null;
  nomeSettimana2: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    aggiornaNomiSettimaneAction,
    undefined
  );

  return (
    <form
      key={`${nomeSettimana1 ?? ""}::${nomeSettimana2 ?? ""}`}
      action={formAction}
      className={`${styles.formCompatto} ${styles.formInline}`}
    >
      <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
      <div className={styles.formCompatto}>
        <label htmlFor={`nome-settimana-1-${edizioneTorneoId}`}>Settimana 1</label>
        <input
          id={`nome-settimana-1-${edizioneTorneoId}`}
          type="text"
          name="nomeSettimana1"
          maxLength={NOME_SETTIMANA_MAX}
          placeholder="Settimana 1"
          defaultValue={nomeSettimana1 ?? ""}
        />
      </div>
      <div className={styles.formCompatto}>
        <label htmlFor={`nome-settimana-2-${edizioneTorneoId}`}>Settimana 2</label>
        <input
          id={`nome-settimana-2-${edizioneTorneoId}`}
          type="text"
          name="nomeSettimana2"
          maxLength={NOME_SETTIMANA_MAX}
          placeholder="Settimana 2"
          defaultValue={nomeSettimana2 ?? ""}
        />
      </div>
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        Salva
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Nomi salvati.
        </p>
      )}
    </form>
  );
}

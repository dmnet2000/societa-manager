"use client";

import { useActionState } from "react";
import { aggiornaNomiSettimaneAction, aggiornaVisibilitaSettimanaTorneoAction } from "../actions";
import { NOME_SETTIMANA_MAX } from "@/lib/settimana-torneo";
import type { SettimanaTorneo } from "@prisma/client";
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
// Story 20.29 (Epic 20, Torneo Memorial): mirror del bottone di visibilita'
// di GruppoOrdineRow.tsx (app/(configurazione)/ordine-squadre, Story 19.16)
// - un useActionState indipendente per un controllo indipendente, stesso
// principio gia' applicato li'. Un bottone per Settimana (non un checkbox
// dentro il form dei nomi sopra): un click aggiorna subito il flag, senza
// dover anche toccare/salvare il nome della Settimana. L'etichetta riflette
// sempre lo stato corrente arrivato da server (spec-20-29 I/O matrix: "i due
// bottoni riflettono lo stato corrente").
function NascondiConcluseSettimanaToggle({
  edizioneTorneoId,
  settimana,
  etichettaSettimana,
  nascondiConcluse,
}: {
  edizioneTorneoId: string;
  settimana: SettimanaTorneo;
  etichettaSettimana: string;
  nascondiConcluse: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    aggiornaVisibilitaSettimanaTorneoAction,
    undefined
  );

  return (
    <form action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
      <input type="hidden" name="settimana" value={settimana} />
      <input type="hidden" name="nascondiConcluse" value={String(!nascondiConcluse)} />
      <button
        disabled={pending}
        type="submit"
        className={styles.bottoneCompatto}
        aria-label={
          nascondiConcluse
            ? `Mostra di nuovo su /torneo le Categorie concluse di ${etichettaSettimana}`
            : `Nascondi su /torneo le Categorie concluse di ${etichettaSettimana}`
        }
      >
        {nascondiConcluse
          ? `Categorie concluse nascoste (${etichettaSettimana})`
          : `Nascondi le Categorie concluse (${etichettaSettimana})`}
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {/* Review fix (Blind Hunter + Edge Case Hunter, convergenti): nessuna
          conferma visiva dopo un salvataggio riuscito, a differenza del form
          dei nomi sotto che gia' mostra "Nomi salvati." - stesso pattern
          role="status" qui riusato tale e quale. */}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Aggiornato.
        </p>
      )}
    </form>
  );
}

export function NomiSettimaneTorneoForm({
  edizioneTorneoId,
  nomeSettimana1,
  nomeSettimana2,
  nascondiConcluseSettimana1,
  nascondiConcluseSettimana2,
}: {
  edizioneTorneoId: string;
  nomeSettimana1: string | null;
  nomeSettimana2: string | null;
  nascondiConcluseSettimana1: boolean;
  nascondiConcluseSettimana2: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    aggiornaNomiSettimaneAction,
    undefined
  );

  return (
    <>
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

      {/* Story 20.29: un bottone/toggle per Settimana - nasconde su /torneo
          tutte le Categorie gia' concluse di quella Settimana (spec-20-29
          Boundaries "Always"), indipendente dal form dei nomi sopra. */}
      <div className={`${styles.formCompatto} ${styles.formInline}`}>
        <NascondiConcluseSettimanaToggle
          edizioneTorneoId={edizioneTorneoId}
          settimana="SETTIMANA_1"
          etichettaSettimana="Settimana 1"
          nascondiConcluse={nascondiConcluseSettimana1}
        />
        <NascondiConcluseSettimanaToggle
          edizioneTorneoId={edizioneTorneoId}
          settimana="SETTIMANA_2"
          etichettaSettimana="Settimana 2"
          nascondiConcluse={nascondiConcluseSettimana2}
        />
      </div>
    </>
  );
}

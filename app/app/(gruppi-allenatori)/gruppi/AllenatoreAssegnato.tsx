"use client";

import { useActionState } from "react";
import { rimuoviAllenatore } from "./actions";
import styles from "./gruppi.module.css";

export type Allenatore = {
  id: string;
  nome: string;
  cognome: string;
};

// Story 9.32: mirror 1:1 di AtletaAssegnata.tsx - componente separato (non
// un ciclo dentro GruppoRow.tsx) perche' ogni Allenatore ha bisogno del
// proprio useActionState indipendente, il numero di Allenatori per Gruppo
// e' variabile e gli Hook non possono essere chiamati in un ciclo.
export function AllenatoreAssegnato({
  gruppoId,
  gruppoNome,
  allenatore,
}: {
  gruppoId: string;
  gruppoNome: string;
  allenatore: Allenatore;
}) {
  const [state, formAction, pending] = useActionState(rimuoviAllenatore, undefined);

  return (
    <li className={styles.atletaAssegnata}>
      <span>
        {allenatore.nome} {allenatore.cognome}
      </span>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Rimuovere ${allenatore.nome} ${allenatore.cognome} dal Gruppo ${gruppoNome}?`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="gruppoId" value={gruppoId} />
        <input type="hidden" name="allenatoreId" value={allenatore.id} />
        <button
          disabled={pending}
          type="submit"
          className={styles.bottoneRimuovi}
          aria-label={`Rimuovi ${allenatore.nome} ${allenatore.cognome} dal Gruppo ${gruppoNome}`}
        >
          Rimuovi
        </button>
      </form>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </li>
  );
}

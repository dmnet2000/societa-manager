"use client";

import { useActionState } from "react";
import { rimuoviAtleta } from "./actions";
import styles from "./gruppi.module.css";

// Review fix: esportato invece di ridichiarato indipendentemente in
// GruppoRow.tsx - un futuro campo aggiunto qui non si disallineerebbe
// silenziosamente dall'altra copia.
export type Atleta = {
  id: string;
  nome: string;
};

// Story 9.14: componente separato (non un ciclo dentro GruppoRow.tsx) perche'
// ogni Atleta ha bisogno del proprio useActionState indipendente - il numero
// di Atlete per Gruppo e' variabile, gli Hook non possono essere chiamati in
// un ciclo. Stesso pattern di conferma/aria-label di AllenatoreRow.tsx/
// SlotRow.tsx (Story 9.9/9.13).
export function AtletaAssegnata({
  gruppoId,
  gruppoNome,
  atleta,
}: {
  gruppoId: string;
  gruppoNome: string;
  atleta: Atleta;
}) {
  const [state, formAction, pending] = useActionState(rimuoviAtleta, undefined);

  return (
    <li className={styles.atletaAssegnata}>
      <span>{atleta.nome}</span>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Rimuovere ${atleta.nome} dal Gruppo ${gruppoNome}?`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="gruppoId" value={gruppoId} />
        <input type="hidden" name="atletaId" value={atleta.id} />
        <button
          disabled={pending}
          type="submit"
          className={styles.bottoneRimuovi}
          aria-label={`Rimuovi ${atleta.nome} dal Gruppo ${gruppoNome}`}
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

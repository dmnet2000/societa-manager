"use client";

import { useActionState, useState } from "react";
import { aggiornaCampionato } from "./actions";
import styles from "./campionati.module.css";

// Story 10.8: toggle sola-lettura/modifica inline sullo stesso <li> già
// usato da ImportaGareForm/EliminaCampionatoForm - nessun ridisegno
// tabellare (a differenza di SlotRow.tsx/AllenatoreRow.tsx, Story 15.5/9.30:
// qui non c'è alcuna richiesta di ridisegno, la lista Campionati resta un
// <ul>/<li> semplice). Ricollasso automatico dopo un salvataggio riuscito
// con "adjust state during render" (stesso pattern di SlotRow.tsx/
// PartitaRow.tsx), non un useEffect con setState - violerebbe
// react-hooks/set-state-in-effect.
export function ModificaCampionatoForm({
  campionatoId,
  nome,
  linkFipav,
}: {
  campionatoId: string;
  nome: string;
  linkFipav: string | null;
}) {
  const [state, formAction, pending] = useActionState(aggiornaCampionato, undefined);
  const [inModifica, setInModifica] = useState(false);

  const [ultimoState, setUltimoState] = useState(state);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setInModifica(false);
    }
  }

  if (!inModifica) {
    return (
      <div className={styles.rigaCampionato}>
        <span>{nome}</span>
        {linkFipav && (
          <a
            href={linkFipav}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.linkFipav}
            aria-label={`Portale FIPAV del Campionato ${nome}`}
          >
            Portale FIPAV
          </a>
        )}
        <button
          type="button"
          onClick={() => setInModifica(true)}
          className={styles.bottoneCompatto}
          aria-label={`Modifica il Campionato ${nome}`}
        >
          Modifica
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="campionatoId" value={campionatoId} />
      <label htmlFor={`modifica-campionato-nome-${campionatoId}`}>Nome</label>
      <input
        id={`modifica-campionato-nome-${campionatoId}`}
        name="nome"
        type="text"
        defaultValue={nome}
        required
      />
      <label htmlFor={`modifica-campionato-link-${campionatoId}`}>
        Link portale FIPAV (opzionale)
      </label>
      <input
        id={`modifica-campionato-link-${campionatoId}`}
        name="linkFipav"
        type="url"
        defaultValue={linkFipav ?? ""}
      />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <div className={styles.azioniCompatto}>
        <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
          Salva
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setInModifica(false)}
          className={styles.bottoneCompatto}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { aggiornaAllenatore, cancellaAllenatore } from "./actions";
import styles from "./precaricamento-allenatori.module.css";

type Allenatore = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  utenteId: string | null;
};

// Story 9.9: stesso pattern di PalestraRow.tsx (form di modifica inline
// precompilato) + un secondo form separato per la cancellazione. Il
// guard-clause reale (Allenatore non agganciato/non assegnato) resta lato
// server in cancellaAllenatore (unica vera protezione) - la conferma
// `window.confirm` qui (review fix) e' solo un secondo passaggio contro un
// click accidentale, dato che e' il primo hard-delete di un'entita' di
// dominio in questo progetto.
export function AllenatoreRow({ allenatore }: { allenatore: Allenatore }) {
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaAllenatore,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaAllenatore,
    undefined
  );
  const nomeCompleto = `${allenatore.nome} ${allenatore.cognome}`;
  // Review fix: un pulsante disabilitato solo dal proprio "pending" permette
  // di inviare Salva mentre Cancella e' ancora in corso (o viceversa) sulla
  // stessa riga - risultato imprevedibile (modifica su un id gia' cancellato,
  // o esito che arriva su una riga nel frattempo rimossa dal DOM).
  const azionePending = modificaPending || cancellaPending;

  return (
    <article className={styles.card}>
      <form action={modificaAction} className={styles.form}>
        <input type="hidden" name="id" value={allenatore.id} />
        <div className={styles.campo}>
          <label htmlFor={`allenatore-nome-${allenatore.id}`}>Nome</label>
          <input
            id={`allenatore-nome-${allenatore.id}`}
            name="nome"
            type="text"
            defaultValue={allenatore.nome}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`allenatore-cognome-${allenatore.id}`}>Cognome</label>
          <input
            id={`allenatore-cognome-${allenatore.id}`}
            name="cognome"
            type="text"
            defaultValue={allenatore.cognome}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`allenatore-cf-${allenatore.id}`}>Codice Fiscale</label>
          <input
            id={`allenatore-cf-${allenatore.id}`}
            name="codiceFiscale"
            type="text"
            defaultValue={allenatore.codiceFiscale}
            required
          />
        </div>
        <p className={styles.stato}>
          {allenatore.utenteId ? "Registrato" : "Precaricato"}
        </p>
        {modificaState && "error" in modificaState && (
          <p role="alert" className={styles.errore}>
            {modificaState.error.message}
          </p>
        )}
        <button
          disabled={azionePending}
          type="submit"
          className={styles.bottone}
          aria-label={`Salva ${nomeCompleto}`}
        >
          Salva
        </button>
      </form>
      <form
        action={cancellaAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Cancellare l'Allenatore ${nomeCompleto}? L'operazione non è reversibile.`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={allenatore.id} />
        {cancellaState && "error" in cancellaState && (
          <p role="alert" className={styles.errore}>
            {cancellaState.error.message}
          </p>
        )}
        <button
          disabled={azionePending}
          type="submit"
          className={styles.bottoneSecondario}
          aria-label={`Cancella ${nomeCompleto}`}
        >
          Cancella
        </button>
      </form>
    </article>
  );
}

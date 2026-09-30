"use client";

import { useActionState, useState } from "react";
import { aggiornaDatiAtletaAction } from "./actions";
import styles from "./gruppi.module.css";

// Story 9.45: dati anagrafici correnti da pre-compilare nel form - dataNascita
// gia' nel formato yyyy-mm-dd atteso da <input type="date"> (troncata dal
// chiamante, stesso pattern gia' in uso in conferma-certificati/page.tsx per
// dataInizioValidita/dataFineValidita), mai un ISOString completo.
export type DatiAnagraficiAtleta = {
  dataNascita: string;
  codiceFiscale: string;
  email: string | null;
  cellulare: string | null;
};

// Story 9.45: componente condiviso - usato sia nel ramo di gestione
// (AtletaTabellaRiga.tsx, cella Nome) sia nel ramo di sola lettura Segreteria
// di gruppi/page.tsx. Toggle sola-lettura/modifica mirror di GruppoRow.tsx
// (righe 45-71, Story 9.37) - stessa "adjust state during render" per
// ricollassare al successo e per non far riapparire l'errore di un
// tentativo precedente riaprendo "Modifica" dopo "Annulla".
export function ModificaDatiAtletaForm({
  atletaId,
  nome,
  dati,
}: {
  atletaId: string;
  nome: string;
  dati: DatiAnagraficiAtleta;
}) {
  const [inModifica, setInModifica] = useState(false);
  const [state, formAction, pending] = useActionState(
    aggiornaDatiAtletaAction,
    undefined
  );
  const [ultimoState, setUltimoState] = useState(state);
  const [erroreVisibile, setErroreVisibile] = useState(false);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setInModifica(false);
      setErroreVisibile(false);
    } else if (state && "error" in state) {
      setErroreVisibile(true);
    }
  }

  if (!inModifica) {
    return (
      <>
        {nome}{" "}
        <button
          type="button"
          className={styles.bottoneCompatto}
          onClick={() => {
            setInModifica(true);
            setErroreVisibile(false);
          }}
          aria-label={`Modifica dati anagrafici di ${nome}`}
        >
          Modifica
        </button>
      </>
    );
  }

  return (
    <form action={formAction} className={styles.formModificaGruppo}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <div className={styles.campo}>
        <label htmlFor={`atleta-nome-${atletaId}`}>Nome e cognome</label>
        <input
          id={`atleta-nome-${atletaId}`}
          name="nome"
          type="text"
          defaultValue={nome}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`atleta-data-nascita-${atletaId}`}>Data di nascita</label>
        <input
          id={`atleta-data-nascita-${atletaId}`}
          name="dataNascita"
          type="date"
          defaultValue={dati.dataNascita}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`atleta-codice-fiscale-${atletaId}`}>Codice Fiscale</label>
        <input
          id={`atleta-codice-fiscale-${atletaId}`}
          name="codiceFiscale"
          type="text"
          defaultValue={dati.codiceFiscale}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`atleta-email-${atletaId}`}>Email (opzionale)</label>
        <input
          id={`atleta-email-${atletaId}`}
          name="email"
          type="email"
          defaultValue={dati.email ?? ""}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`atleta-cellulare-${atletaId}`}>Cellulare (opzionale)</label>
        <input
          id={`atleta-cellulare-${atletaId}`}
          name="cellulare"
          type="tel"
          defaultValue={dati.cellulare ?? ""}
        />
      </div>
      {erroreVisibile && state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <div className={styles.azioniCompatto}>
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva
        </button>
        <button
          type="button"
          disabled={pending}
          className={styles.bottoneSecondario}
          onClick={() => setInModifica(false)}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

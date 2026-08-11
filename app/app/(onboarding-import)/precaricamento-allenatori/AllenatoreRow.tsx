"use client";

import { useState, useActionState } from "react";
import { aggiornaAllenatore, cancellaAllenatore } from "./actions";
import { IconaModifica, IconaCancella } from "@/app/icone-azione-riga";
import styles from "./precaricamento-allenatori.module.css";

type Allenatore = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  utenteId: string | null;
};

// Story 9.30: da <article> card sempre espansa a riga di tabella con toggle
// sola-lettura/modifica - stesso pattern gia' stabilito da PartitaRow.tsx
// (Story 10.4) e applicato piu' di recente da SlotRow.tsx (Story 15.5), non
// reinventato: useState "inModifica", useActionState per
// aggiornaAllenatore/cancellaAllenatore (invariati, Story 9.9), azionePending
// condiviso, ricollasso automatico alla vista dopo un salvataggio riuscito
// ("adjust state during render", non un useEffect con setState - violerebbe
// react-hooks/set-state-in-effect). Icone condivise con SlotRow.tsx
// (app/icone-azione-riga.tsx, estratte da questa storia - secondo consumer
// reale).
export function AllenatoreRow({ allenatore }: { allenatore: Allenatore }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaAllenatore,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaAllenatore,
    undefined
  );
  // Review fix gia' applicato in Story 9.9/10.4/15.5: un pulsante disabilitato
  // solo dal proprio "pending" permetterebbe di inviare Salva mentre
  // Cancella e' ancora in corso sulla stessa riga (o viceversa).
  const azionePending = modificaPending || cancellaPending;

  // Stesso pattern di PartitaRow.tsx/SlotRow.tsx: ricollassa automaticamente
  // alla vista di sola lettura dopo un salvataggio riuscito.
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
    }
  }

  const nomeCompleto = `${allenatore.nome} ${allenatore.cognome}`;
  const stato = allenatore.utenteId ? "Registrato" : "Precaricato";

  return (
    <>
      <tr>
        <td>{allenatore.nome}</td>
        <td>{allenatore.cognome}</td>
        <td>{allenatore.codiceFiscale}</td>
        <td>{stato}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => setInModifica(true)}
            disabled={azionePending || inModifica}
            aria-label={`Modifica ${nomeCompleto}`}
            title={`Modifica ${nomeCompleto}`}
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
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
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${nomeCompleto}`}
              title={`Cancella ${nomeCompleto}`}
            >
              <IconaCancella />
            </button>
          </form>
          {cancellaState && "error" in cancellaState && (
            <p role="alert" className={styles.errore}>
              {cancellaState.error.message}
            </p>
          )}
        </td>
      </tr>
      {inModifica && (
        <tr>
          <td colSpan={5}>
            <form action={modificaAction} className={styles.form}>
              <input type="hidden" name="id" value={allenatore.id} />
              <div className={styles.campiRiga}>
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
              </div>
              {modificaState && "error" in modificaState && (
                <p role="alert" className={styles.errore}>
                  {modificaState.error.message}
                </p>
              )}
              <div className={styles.campiRiga}>
                <button
                  disabled={azionePending}
                  type="submit"
                  className={styles.bottone}
                  aria-label={`Salva ${nomeCompleto}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${nomeCompleto}`}
                >
                  Annulla
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

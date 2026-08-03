"use client";

import { useState, useActionState } from "react";
import { aggiornaPartita, cancellaPartita } from "./actions";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { EliminaPartitaForm } from "./EliminaPartitaForm";
import styles from "./partite.module.css";

type Partita = {
  id: string;
  data: string;
  dataFormattata: string;
  ora: string;
  impianto: string | null;
  indirizzoImpianto: string | null;
  squadraCasa: string;
  squadraOspite: string;
  gruppoNome: string;
  campionatoNome: string;
};

// Story 10.4: stesso pattern "riga con toggle Modifica/Annulla" gia'
// stabilito da SlotRow.tsx (Story 9.13)/AllenatoreRow.tsx (Story 9.9) - qui
// pero' la riga di visualizzazione e' un <tr> di tabella (non una <article>
// card), quindi la riga di modifica e' un secondo <tr> con un unico
// <td colSpan> invece di un secondo <form> nella stessa riga. Estrae
// l'intero rendering della riga oggi inline in page.tsx (nessun cambio alla
// markup di visualizzazione, resta pixel-identica).
export function PartitaRow({ partita }: { partita: Partita }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaPartita,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaPartita,
    undefined
  );
  // Review fix (code review Story 10.4): un pulsante disabilitato solo dal
  // proprio "pending" permetterebbe di inviare Salva mentre Cancella e'
  // ancora in corso sulla stessa riga (o viceversa) - stesso identico
  // principio gia' applicato in SlotRow.tsx (Story 9.13).
  const azionePending = modificaPending || cancellaPending;

  // Ricollassa automaticamente alla vista dopo un salvataggio riuscito.
  // Aggiustamento di stato durante il render (pattern raccomandato da React
  // per "adjusting state when a prop/altro stato cambia") invece di un
  // useEffect con setState sincrono al suo interno - quest'ultimo violerebbe
  // la regola ESLint react-hooks/set-state-in-effect (cascading renders) -
  // nessun precedente identico in questo progetto, dove i form esistenti
  // (SlotRow/AllenatoreRow) usano useEffect solo per un reset() imperativo
  // del DOM, non per un setState React.
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
    }
  }

  const linkNaviga = costruisciLinkNaviga({ indirizzo: partita.indirizzoImpianto });

  return (
    <>
      <tr>
        <td>{partita.dataFormattata}</td>
        <td>{partita.ora}</td>
        <td>
          {partita.squadraCasa} - {partita.squadraOspite}
        </td>
        <td>
          {partita.impianto}
          {linkNaviga && (
            <>
              {" "}
              <a
                className={styles.linkNaviga}
                href={linkNaviga}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Naviga verso ${partita.impianto ?? "il luogo della partita"}`}
              >
                Naviga
              </a>
            </>
          )}
        </td>
        <td>{partita.gruppoNome}</td>
        <td>{partita.campionatoNome}</td>
        <td>
          <button
            type="button"
            className={styles.bottoneSecondario}
            onClick={() => setInModifica(true)}
            disabled={azionePending || inModifica}
            aria-label={`Modifica la Partita ${partita.squadraCasa} - ${partita.squadraOspite} del ${partita.dataFormattata}`}
          >
            Modifica
          </button>{" "}
          <EliminaPartitaForm
            partitaId={partita.id}
            squadraCasa={partita.squadraCasa}
            squadraOspite={partita.squadraOspite}
            data={partita.dataFormattata}
            action={cancellaAction}
            state={cancellaState}
            disabled={azionePending || inModifica}
          />
        </td>
      </tr>
      {inModifica && (
        <tr>
          <td colSpan={7}>
            <form action={modificaAction} className={styles.form}>
              <input type="hidden" name="partitaId" value={partita.id} />
              <p className={styles.testo}>
                {partita.squadraCasa} - {partita.squadraOspite} ({partita.gruppoNome}
                {" - "}
                {partita.campionatoNome})
              </p>
              <div className={styles.campiRiga}>
                <div className={styles.campo}>
                  <label htmlFor={`partita-data-${partita.id}`}>Data</label>
                  <input
                    id={`partita-data-${partita.id}`}
                    name="data"
                    type="date"
                    defaultValue={partita.data}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`partita-ora-${partita.id}`}>Ora</label>
                  <input
                    id={`partita-ora-${partita.id}`}
                    name="ora"
                    type="time"
                    defaultValue={partita.ora}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`partita-impianto-${partita.id}`}>Impianto</label>
                  <input
                    id={`partita-impianto-${partita.id}`}
                    name="impianto"
                    type="text"
                    defaultValue={partita.impianto ?? ""}
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`partita-indirizzo-${partita.id}`}>
                    Indirizzo impianto
                  </label>
                  <input
                    id={`partita-indirizzo-${partita.id}`}
                    name="indirizzoImpianto"
                    type="text"
                    defaultValue={partita.indirizzoImpianto ?? ""}
                  />
                </div>
              </div>
              {modificaState && "error" in modificaState && (
                <p role="alert" className={styles.errore}>
                  {modificaState.error.message}
                </p>
              )}
              <div className={styles.campiRiga}>
                <button disabled={azionePending} type="submit" className={styles.bottone}>
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
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

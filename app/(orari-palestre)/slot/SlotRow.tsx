"use client";

import { useState, useActionState } from "react";
import { aggiornaSlot, cancellaSlot } from "./actions";
import { GIORNI_SETTIMANA, ETICHETTA_GIORNO } from "@/lib/giorno-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import type { GiornoSettimana } from "@prisma/client";
import styles from "./slot.module.css";

type Slot = {
  id: string;
  giorno: GiornoSettimana;
  oraInizio: string;
  oraFine: string;
  campoId: string;
  gruppoId: string;
};

type Campo = {
  id: string;
  nome: string;
  palestra: {
    nome: string;
    indirizzo: string | null;
    latitudine: number | null;
    longitudine: number | null;
  };
};

type Gruppo = {
  id: string;
  nome: string;
};

// Story 15.5: icone inline scritte a mano (nessuna libreria - decisione presa
// in fase di analisi dell'Epic 15). aria-hidden sull'<svg> perche' il
// <button> che lo contiene ha gia' un aria-label esplicito, che da solo e'
// gia' un nome accessibile completo - marcare anche l'icona interna evita
// che uno screen reader provi a descriverne il contenuto grafico oltre al
// nome del bottone (pattern diverso da GraficoMisurazione.tsx, unico altro
// <svg> inline del progetto: li' l'<svg> non e' dentro un <button> e usa
// <title>+role="img" come proprio nome accessibile, non aria-hidden).
function IconaModifica() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2.5a1.5 1.5 0 0 1 2 2l-9 9-3 1 1-3 9-9Z" />
    </svg>
  );
}

function IconaCancella() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h12M8 6V4h4v2M6 6l.5 10h7L14 6M8.5 9v4M11.5 9v4" />
    </svg>
  );
}

// Story 15.5: da <article> card sempre espansa a riga di tabella con toggle
// sola-lettura/modifica - stesso pattern gia' stabilito da PartitaRow.tsx
// (Story 10.4), non reinventato: useState "inModifica", useActionState per
// aggiornaSlot/cancellaSlot (invariati, Story 9.13), azionePending condiviso,
// ricollasso automatico alla vista dopo un salvataggio riuscito ("adjust
// state during render", non un useEffect con setState - violerebbe
// react-hooks/set-state-in-effect).
export function SlotRow({
  slot,
  campi,
  gruppi,
}: {
  slot: Slot;
  campi: Campo[];
  gruppi: Gruppo[];
}) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaSlot,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaSlot,
    undefined
  );
  // Review fix gia' applicato in Story 9.9/10.4: un pulsante disabilitato
  // solo dal proprio "pending" permetterebbe di inviare Salva mentre
  // Cancella e' ancora in corso sulla stessa riga (o viceversa).
  const azionePending = modificaPending || cancellaPending;

  // Stesso pattern di PartitaRow.tsx (Story 10.4): ricollassa automaticamente
  // alla vista di sola lettura dopo un salvataggio riuscito.
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
    }
  }

  // Review fix: etichetta distintiva per riga - senza, piu' righe renderizzate
  // producono per uno screen reader una sequenza indistinguibile di "Modifica,
  // Modifica, Modifica..." (stesso motivo per cui AllenatoreRow.tsx, il
  // pattern che questo componente replica, usa il nome completo
  // dell'Allenatore).
  const etichettaSlot = `${ETICHETTA_GIORNO[slot.giorno]} ${slot.oraInizio}-${slot.oraFine}`;

  const campoAttuale = campi.find((campo) => campo.id === slot.campoId);
  const gruppoAttuale = gruppi.find((gruppo) => gruppo.id === slot.gruppoId);
  const linkNaviga = campoAttuale ? costruisciLinkNaviga(campoAttuale.palestra) : null;

  return (
    <>
      <tr>
        <td>{ETICHETTA_GIORNO[slot.giorno]}</td>
        <td>
          {slot.oraInizio}-{slot.oraFine}
        </td>
        <td>
          {campoAttuale ? `${campoAttuale.palestra.nome} - ${campoAttuale.nome}` : "—"}
          {linkNaviga && (
            <>
              {" "}
              <a
                className={styles.linkNaviga}
                href={linkNaviga}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Naviga verso ${campoAttuale?.palestra.nome}`}
              >
                Naviga
              </a>
            </>
          )}
        </td>
        <td>{gruppoAttuale?.nome ?? "—"}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => setInModifica(true)}
            disabled={azionePending || inModifica}
            aria-label={`Modifica ${etichettaSlot}`}
            title={`Modifica ${etichettaSlot}`}
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
            action={cancellaAction}
            onSubmit={(e) => {
              if (
                !window.confirm("Cancellare questo Slot? L'operazione non è reversibile.")
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={slot.id} />
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${etichettaSlot}`}
              title={`Cancella ${etichettaSlot}`}
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
              <input type="hidden" name="id" value={slot.id} />
              <div className={styles.campiRiga}>
                <div className={styles.campo}>
                  <label htmlFor={`slot-giorno-${slot.id}`}>Giorno</label>
                  <select
                    id={`slot-giorno-${slot.id}`}
                    name="giorno"
                    required
                    defaultValue={slot.giorno}
                  >
                    {GIORNI_SETTIMANA.map((giorno) => (
                      <option key={giorno.value} value={giorno.value}>
                        {giorno.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-ora-inizio-${slot.id}`}>Ora inizio</label>
                  <input
                    id={`slot-ora-inizio-${slot.id}`}
                    name="oraInizio"
                    type="time"
                    defaultValue={slot.oraInizio}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-ora-fine-${slot.id}`}>Ora fine</label>
                  <input
                    id={`slot-ora-fine-${slot.id}`}
                    name="oraFine"
                    type="time"
                    defaultValue={slot.oraFine}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-campo-${slot.id}`}>Campo</label>
                  <select
                    id={`slot-campo-${slot.id}`}
                    name="campoId"
                    required
                    defaultValue={slot.campoId}
                  >
                    {campi.map((campo) => (
                      <option key={campo.id} value={campo.id}>
                        {campo.palestra.nome} - {campo.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-gruppo-${slot.id}`}>Gruppo</label>
                  <select
                    id={`slot-gruppo-${slot.id}`}
                    name="gruppoId"
                    required
                    defaultValue={slot.gruppoId}
                  >
                    {gruppi.map((gruppo) => (
                      <option key={gruppo.id} value={gruppo.id}>
                        {gruppo.nome}
                      </option>
                    ))}
                  </select>
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
                  aria-label={`Salva ${etichettaSlot}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${etichettaSlot}`}
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

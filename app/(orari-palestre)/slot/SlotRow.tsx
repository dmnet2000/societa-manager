"use client";

import { useActionState } from "react";
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

// Story 9.13: stesso identico pattern di AllenatoreRow.tsx (Story 9.9) - form
// di modifica inline precompilato + form separato di cancellazione con
// window.confirm. SlotTable.tsx resta invariato (condiviso con /orari e
// /mio-orario, sola lettura) - questo componente e' usato solo da /slot.
export function SlotRow({
  slot,
  campi,
  gruppi,
}: {
  slot: Slot;
  campi: Campo[];
  gruppi: Gruppo[];
}) {
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaSlot,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaSlot,
    undefined
  );
  // Review fix gia' applicato in Story 9.9: un pulsante disabilitato solo dal
  // proprio "pending" permetterebbe di inviare Salva mentre Cancella e'
  // ancora in corso sulla stessa riga (o viceversa).
  const azionePending = modificaPending || cancellaPending;

  // Review fix: etichetta distintiva per riga - senza, piu' righe renderizzate
  // producono per uno screen reader una sequenza indistinguibile di "Salva,
  // Salva, Salva..." (stesso motivo per cui AllenatoreRow.tsx, il pattern che
  // questo componente replica, usa il nome completo dell'Allenatore).
  const etichettaSlot = `${ETICHETTA_GIORNO[slot.giorno]} ${slot.oraInizio}-${slot.oraFine}`;

  // Review fix: il link "Naviga" era presente per ogni riga nella vecchia
  // SlotTable (rimossa da questa pagina) - ripristinato qui per il Campo
  // attualmente salvato sullo Slot (non per una selezione non ancora
  // salvata nel <select> sotto).
  const campoAttuale = campi.find((campo) => campo.id === slot.campoId);
  const linkNaviga = campoAttuale ? costruisciLinkNaviga(campoAttuale.palestra) : null;

  return (
    <article className={styles.card}>
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
            {linkNaviga && (
              <a
                className={styles.linkNaviga}
                href={linkNaviga}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Naviga verso ${campoAttuale?.palestra.nome}`}
              >
                Naviga
              </a>
            )}
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
        <button
          disabled={azionePending}
          type="submit"
          className={styles.bottone}
          aria-label={`Salva ${etichettaSlot}`}
        >
          Salva
        </button>
      </form>
      <form
        action={cancellaAction}
        onSubmit={(e) => {
          if (!window.confirm("Cancellare questo Slot? L'operazione non è reversibile.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={slot.id} />
        {cancellaState && "error" in cancellaState && (
          <p role="alert" className={styles.errore}>
            {cancellaState.error.message}
          </p>
        )}
        <button
          disabled={azionePending}
          type="submit"
          className={styles.bottoneSecondario}
          aria-label={`Cancella ${etichettaSlot}`}
        >
          Cancella
        </button>
      </form>
    </article>
  );
}

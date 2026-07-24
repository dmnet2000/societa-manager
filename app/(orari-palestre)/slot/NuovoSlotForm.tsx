"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaSlot } from "./actions";
import { GIORNI_SETTIMANA } from "@/lib/giorno-settimana";
import styles from "./slot.module.css";

type Campo = {
  id: string;
  nome: string;
  palestra: { nome: string };
};

type Gruppo = {
  id: string;
  nome: string;
};

export function NuovoSlotForm({
  campi,
  gruppi,
}: {
  campi: Campo[];
  gruppi: Gruppo[];
}) {
  const [state, formAction, pending] = useActionState(creaSlot, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="nuovo-slot-giorno">Giorno</label>
        <select id="nuovo-slot-giorno" name="giorno" required defaultValue="">
          <option value="" disabled>
            Seleziona...
          </option>
          {GIORNI_SETTIMANA.map((giorno) => (
            <option key={giorno.value} value={giorno.value}>
              {giorno.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-slot-ora-inizio">Ora inizio</label>
        <input id="nuovo-slot-ora-inizio" name="oraInizio" type="time" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-slot-ora-fine">Ora fine</label>
        <input id="nuovo-slot-ora-fine" name="oraFine" type="time" required />
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-slot-campo">Campo</label>
        <select id="nuovo-slot-campo" name="campoId" required defaultValue="">
          <option value="" disabled>
            Seleziona...
          </option>
          {campi.map((campo) => (
            <option key={campo.id} value={campo.id}>
              {campo.palestra.nome} - {campo.nome}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="nuovo-slot-gruppo">Gruppo</label>
        <select id="nuovo-slot-gruppo" name="gruppoId" required defaultValue="">
          <option value="" disabled>
            Seleziona...
          </option>
          {gruppi.map((gruppo) => (
            <option key={gruppo.id} value={gruppo.id}>
              {gruppo.nome}
            </option>
          ))}
        </select>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Slot creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Slot
      </button>
    </form>
  );
}

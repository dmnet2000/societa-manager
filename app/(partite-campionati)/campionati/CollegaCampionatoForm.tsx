"use client";

import { useActionState, useEffect, useRef } from "react";
import { collegaCampionatoEsistente } from "./actions";
import styles from "./campionati.module.css";

type Campionato = { id: string; nome: string };

// Stesso pattern di GruppoRow.tsx (Story 2.2/2.3, <select> di assegnazione).
export function CollegaCampionatoForm({
  gruppoId,
  campionatiDisponibili,
}: {
  gruppoId: string;
  campionatiDisponibili: Campionato[];
}) {
  const [state, formAction, pending] = useActionState(
    collegaCampionatoEsistente,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  if (campionatiDisponibili.length === 0) {
    return null;
  }

  return (
    <form ref={formRef} action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="gruppoId" value={gruppoId} />
      <label htmlFor={`collega-campionato-${gruppoId}`}>
        Collega Campionato esistente
      </label>
      <select id={`collega-campionato-${gruppoId}`} name="campionatoId" required>
        <option value="">Seleziona...</option>
        {campionatiDisponibili.map((campionato) => (
          <option key={campionato.id} value={campionato.id}>
            {campionato.nome}
          </option>
        ))}
      </select>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        Collega
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaCampionato } from "./actions";
import styles from "./campionati.module.css";

// Stesso pattern di GruppoRow.tsx (Story 2.2/2.3): gruppoId passato come
// campo hidden dentro il form, non legato via .bind() - qui e' un valore
// esplicito e non ambiguo (la riga della tabella a cui il form appartiene),
// a differenza del discriminatore "tipo" di Story 9.12 (che risolveva
// un'identita' ambigua dalla sessione). L'autorizzazione/il possesso del
// Gruppo restano comunque verificati sempre lato server in creaCampionato,
// indipendentemente da come gruppoId arriva.
export function NuovoCampionatoForm({ gruppoId }: { gruppoId: string }) {
  const [state, formAction, pending] = useActionState(creaCampionato, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="gruppoId" value={gruppoId} />
      <label htmlFor={`nuovo-campionato-nome-${gruppoId}`}>Nuovo Campionato</label>
      <input
        id={`nuovo-campionato-nome-${gruppoId}`}
        name="nome"
        type="text"
        required
      />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        Crea
      </button>
    </form>
  );
}

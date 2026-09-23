"use client";

import { useActionState } from "react";
import { sincronizzaGareFipav } from "./sincronizza-fipav-actions";
import styles from "./campionati.module.css";

// Story 10.11: mirror di ImportaGareForm (Story 10.2) - stesso pattern
// bottone + riepilogo role="status", esteso con "bloccate da modifica
// manuale". Montato solo se il Campionato ha un linkFipav (il chiamante
// filtra), ma l'autorizzazione/il controllo linkFipav restano comunque
// server-side in sincronizzaGareFipav (difesa in profondita', stesso
// principio di ogni altra Server Action del progetto).
export function SincronizzaFipavForm({
  gruppoId,
  campionatoId,
}: {
  gruppoId: string;
  campionatoId: string;
}) {
  const [state, formAction, pending] = useActionState(sincronizzaGareFipav, undefined);

  return (
    <form action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="gruppoId" value={gruppoId} />
      <input type="hidden" name="campionatoId" value={campionatoId} />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        Sincronizza da FIPAV
      </button>

      {state && "success" in state && (
        <section role="status" className={styles.riepilogoCompatto}>
          <p>Partite create: {state.create}</p>
          <p>Partite aggiornate: {state.aggiornate}</p>
          <p>Bloccate da modifica manuale: {state.bloccate}</p>
          <p>Righe scartate: {state.scartate.length}</p>
          {state.scartate.length > 0 && (
            <ul className={styles.scartateCompatto}>
              {state.scartate.map((riga) => (
                <li key={riga.numeroRiga}>
                  Riga {riga.numeroRiga}: {riga.motivo}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}

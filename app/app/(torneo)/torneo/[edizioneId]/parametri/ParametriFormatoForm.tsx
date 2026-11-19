"use client";

import { useActionState } from "react";
import type { ParametriActionState } from "../../actions";
import styles from "../../torneo.module.css";

// Referto elettronico, story 3.8: modulo dei parametri del formato, usato
// per l'Edizione e per ogni Categoria. Campo vuoto = eredita; sotto ogni
// campo il valore effettivo calcolato sul server.

export type CampoParametro = {
  chiave: string;
  etichetta: string;
  /** Valore impostato qui (testo), vuoto se eredita. */
  impostato: string;
  /** Valore effettivo che il tablet riceve. */
  effettivo: number;
  /** Segnaposto: da dove eredita, con il valore. */
  ereditaDa: string;
};

export function ParametriFormatoForm({
  action,
  campiNascosti,
  idPrefisso,
  campi,
}: {
  action: (prev: ParametriActionState, formData: FormData) => Promise<ParametriActionState>;
  campiNascosti: Record<string, string>;
  idPrefisso: string;
  campi: CampoParametro[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errori: Record<string, string | undefined> =
    state && "error" in state ? (state.errori ?? {}) : {};
  const inseriti: Record<string, string | undefined> =
    state && "error" in state ? (state.inseriti ?? {}) : {};

  return (
    <form action={formAction}>
      {Object.entries(campiNascosti).map(([nome, valore]) => (
        <input key={nome} type="hidden" name={nome} value={valore} />
      ))}
      <div className={styles.campiRiga}>
        {campi.map((c) => {
          const errore = errori[c.chiave];
          const id = `${idPrefisso}-${c.chiave}`;
          // Dopo un rifiuto React azzera il modulo: si rimostra il testo
          // inviato accanto al suo errore.
          const rimostrato = inseriti[c.chiave];
          return (
            <div className={styles.campo} key={c.chiave}>
              <label htmlFor={id}>{c.etichetta}</label>
              <input
                // key sul valore salvato: dopo revalidatePath il campo si
                // rimonta e mostra il dato fresco.
                key={rimostrato === undefined ? c.impostato : `rifiutato:${rimostrato}`}
                id={id}
                name={c.chiave}
                type="text"
                inputMode="numeric"
                defaultValue={rimostrato ?? c.impostato}
                placeholder={c.ereditaDa}
                aria-invalid={errore ? true : undefined}
                aria-describedby={`${id}-info`}
              />
              <small id={`${id}-info`}>
                Valore effettivo: <strong>{c.effettivo}</strong>
              </small>
              {errore && (
                <small role="alert" className={styles.errore}>
                  {errore}
                </small>
              )}
            </div>
          );
        })}
      </div>
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Parametri salvati.
        </p>
      )}
    </form>
  );
}

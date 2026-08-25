"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaVolantinoTorneoAction } from "../actions";
import styles from "../torneo.module.css";

// Story 20.5 (Epic 20, Torneo Memorial): mirror di FotoSquadraForm.tsx
// (app/(gruppi-allenatori)/gruppi/) - stesso pattern di anteprima + upload
// per-entita', qui l'entita' e' l'Edizione (edizioneTorneoId) invece del
// Gruppo. Cache-busting "?v=" sull'aggiornatoIl - volantinoUrl e'
// deterministico, senza il querystring il browser potrebbe continuare a
// mostrare la versione precedente dopo una sostituzione.
export function VolantinoTorneoForm({
  edizioneTorneoId,
  edizioneAnno,
  volantinoEsiste,
  volantinoUrl,
  volantinoAggiornatoIl,
}: {
  edizioneTorneoId: string;
  edizioneAnno: number;
  volantinoEsiste: boolean;
  volantinoUrl: string;
  volantinoAggiornatoIl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    caricaVolantinoTorneoAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Stesso pattern di reset di FotoSquadraForm.tsx - senza, l'input file
  // resterebbe "valorizzato" dopo un upload riuscito.
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className={styles.sezioneVolantino}>
      {volantinoEsiste && (
        <img
          className={styles.anteprimaVolantino}
          src={`${volantinoUrl}?v=${encodeURIComponent(volantinoAggiornatoIl ?? "")}`}
          alt={`Volantino del Torneo, edizione ${edizioneAnno}`}
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        className={`${styles.formCompatto} ${styles.formInline}`}
      >
        <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
        <label htmlFor={`volantino-torneo-${edizioneTorneoId}`}>Volantino</label>
        <input
          id={`volantino-torneo-${edizioneTorneoId}`}
          type="file"
          name="file"
          accept="image/png,image/jpeg"
          required
        />
        <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
          {volantinoEsiste ? "Sostituisci" : "Carica"}
        </button>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

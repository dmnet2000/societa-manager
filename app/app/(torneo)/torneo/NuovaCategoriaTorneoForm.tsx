"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaCategoriaTorneoAction } from "./actions";
import { SETTIMANE_TORNEO } from "@/lib/settimana-torneo";
import styles from "./torneo.module.css";

// Story 20.1 (Epic 20, Torneo Memorial): mirror di NuovoSlotForm.tsx
// (app/(orari-palestre)/slot) - form di creazione, reset automatico dopo un
// salvataggio riuscito.
export function NuovaCategoriaTorneoForm({ edizioneTorneoId }: { edizioneTorneoId: string }) {
  const [state, formAction, pending] = useActionState(creaCategoriaTorneoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
      <div className={styles.campiRiga}>
        <div className={styles.campo}>
          <label htmlFor="nuova-categoria-nome">Nome</label>
          <input id="nuova-categoria-nome" name="nome" type="text" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuova-categoria-settimana">Settimana</label>
          <select id="nuova-categoria-settimana" name="settimana" required defaultValue="">
            <option value="" disabled>
              Seleziona...
            </option>
            {SETTIMANE_TORNEO.map((settimana) => (
              <option key={settimana.value} value={settimana.value}>
                {settimana.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuova-categoria-numero-massimo">Numero massimo squadre</label>
          <input
            id="nuova-categoria-numero-massimo"
            name="numeroMassimoSquadre"
            type="number"
            inputMode="numeric"
            step="1"
            min={2}
            max={8}
            required
          />
        </div>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Categoria creata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Categoria
      </button>
    </form>
  );
}

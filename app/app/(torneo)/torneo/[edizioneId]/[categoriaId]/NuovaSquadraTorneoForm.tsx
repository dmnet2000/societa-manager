"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaSquadraTorneoAction } from "../../actions";
import { GIRONI_TORNEO } from "@/lib/girone-torneo";
import styles from "../../torneo.module.css";

// Story 20.2 (Epic 20, Torneo Memorial): mirror di NuovaCategoriaTorneoForm.tsx
// (app/app/(torneo)/torneo) - form di creazione, reset automatico dopo un
// salvataggio riuscito. referente/contatto sono campi opzionali (nessun
// "required") - un club esterno potrebbe non averli ancora forniti.
// Review fix (Blind Hunter, Story 20.2): colocato con la pagina che lo
// consuma (torneo/[edizioneId]/[categoriaId]/), non piu' in
// torneo/[edizioneId]/.
export function NuovaSquadraTorneoForm({ categoriaTorneoId }: { categoriaTorneoId: string }) {
  const [state, formAction, pending] = useActionState(creaSquadraTorneoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      <div className={styles.campiRiga}>
        <div className={styles.campo}>
          <label htmlFor="nuova-squadra-nome">Nome</label>
          <input id="nuova-squadra-nome" name="nome" type="text" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuova-squadra-girone">Girone</label>
          <select id="nuova-squadra-girone" name="girone" required defaultValue="">
            <option value="" disabled>
              Seleziona...
            </option>
            {GIRONI_TORNEO.map((girone) => (
              <option key={girone.value} value={girone.value}>
                {girone.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuova-squadra-referente">Referente</label>
          <input id="nuova-squadra-referente" name="referente" type="text" />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuova-squadra-contatto">Contatto</label>
          <input id="nuova-squadra-contatto" name="contatto" type="text" />
        </div>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Squadra iscritta.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Iscrivi Squadra
      </button>
    </form>
  );
}

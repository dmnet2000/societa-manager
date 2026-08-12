"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaCertificato } from "./actions";
import styles from "./certificato-medico.module.css";

// Stesso pattern di NuovoSlotForm.tsx (Story 2.5): reset del form dopo un
// upload riuscito, cosi' l'input file non mostra piu' il vecchio nome.
export function CaricaCertificatoForm({ atletaId }: { atletaId: string }) {
  const [state, formAction, pending] = useActionState(
    caricaCertificato,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <p className={styles.uploadLabel}>Carica un nuovo certificato</p>
      {/* Review fix (code review Story 9.20): etichette allineate a quelle
          che la Segreteria vede in conferma (ConfermaCertificatoRow.tsx) -
          stesso dato, stesso nome, per non creare confusione visto che le
          date inserite qui ricompaiono precompilate li'. */}
      <div className={styles.campo}>
        <label htmlFor="certificato-data-inizio">Data inizio validità</label>
        <input
          id="certificato-data-inizio"
          name="dataInizioValidita"
          type="date"
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="certificato-data-fine">Data fine validità</label>
        <input id="certificato-data-fine" name="dataFineValidita" type="date" required />
      </div>
      <div className={styles.dropzone}>
        <label htmlFor="certificato-file">
          File Certificato (PDF, JPG, PNG — max 10MB)
        </label>
        <input
          id="certificato-file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Certificato caricato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottoneCarica}>
        Carica Certificato
      </button>
    </form>
  );
}

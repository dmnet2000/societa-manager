"use client";

import { useActionState } from "react";
import { registraPresenze } from "./actions";
import styles from "./presenze.module.css";

type AtletaMinima = { id: string; nome: string; certificatoScaduto: boolean };

// Story 3.1: un hidden input "rosterAtletaId" per ogni Atleta del roster
// (non solo quelle spuntate) - la Server Action deve sapere quali Atlete
// fanno parte del roster completo per registrare esplicitamente anche le
// assenze (AC #1), dato che un FormData invia solo i checkbox spuntati.
export function PresenzeForm({
  slotId,
  data,
  roster,
  presentiIniziali,
}: {
  slotId: string;
  data: string;
  roster: AtletaMinima[];
  presentiIniziali: string[];
}) {
  const [state, formAction, pending] = useActionState(
    registraPresenze,
    undefined
  );
  const presentiSet = new Set(presentiIniziali);

  return (
    <form action={formAction}>
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="data" value={data} />
      <ul className={styles.lista}>
        {roster.map((atleta) => (
          <li key={atleta.id} className={styles.riga}>
            <input type="hidden" name="rosterAtletaId" value={atleta.id} />
            <label className={styles.etichetta}>
              <input
                type="checkbox"
                name="presenteAtletaId"
                value={atleta.id}
                defaultChecked={presentiSet.has(atleta.id)}
                className={styles.checkbox}
              />
              <span className={styles.nome}>{atleta.nome}</span>
            </label>
            {/* FR-15: puramente informativo - nessun attributo disabled/
                required collegato, non deve mai impedire la registrazione
                della presenza (AC #4). Review fix: niente role="alert" -
                quel ruolo e' una live region per annunci dinamici (vedi
                state.error sotto, che appare dopo il submit), non per
                contenuto gia' presente al render iniziale; su piu' Atlete
                scadute produrrebbe annunci simultanei e non verrebbe
                ri-annunciato spostando il focus sulla riga in un secondo
                momento. */}
            {atleta.certificatoScaduto && (
              <span className={styles.badge}>Certificato scaduto</span>
            )}
          </li>
        ))}
      </ul>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Presenze salvate.
        </p>
      )}
      <div className={styles.saveFooter}>
        <button disabled={pending} type="submit" className={styles.bottoneSalva}>
          Salva presenze
        </button>
      </div>
    </form>
  );
}

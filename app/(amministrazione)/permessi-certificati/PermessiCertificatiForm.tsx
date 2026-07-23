"use client";

import { useActionState } from "react";
import { salvaGruppiVisibiliDirigente } from "./actions";
import styles from "./permessi-certificati.module.css";

export type GruppoSelezionabile = {
  id: string;
  nome: string;
  categoria: string;
};

// Story 5.2 (AC #2, #3): checkbox per Gruppo, pre-selezionate secondo la
// configurazione gia' persistita. Deselezionare tutto e salvare produce
// intenzionalmente zero righe (nessuna restrizione, AC #3) - nessun
// interruttore separato "attivo/disattivo".
export function PermessiCertificatiForm({
  gruppi,
  gruppoIdsVisibili,
}: {
  gruppi: GruppoSelezionabile[];
  gruppoIdsVisibili: string[];
}) {
  const [state, formAction, pending] = useActionState(
    salvaGruppiVisibiliDirigente,
    undefined
  );

  return (
    <form action={formAction}>
      <fieldset className={styles.fieldset}>
        <legend>Gruppi visibili al Dirigente</legend>
        <p className={styles.aiuto}>
          Nessuna selezione = il Dirigente vede i Certificati Medici di tutti i
          Gruppi (comportamento predefinito). Selezionane uno o più per
          limitare la visibilità del Dirigente a quei Gruppi soltanto.
        </p>
        {gruppi.map((gruppo) => (
          <label key={gruppo.id} className={styles.riga}>
            <input
              type="checkbox"
              name="gruppoIds"
              value={gruppo.id}
              defaultChecked={gruppoIdsVisibili.includes(gruppo.id)}
            />
            {gruppo.nome} <span className={styles.categoria}>{gruppo.categoria}</span>
          </label>
        ))}
      </fieldset>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && <p role="status">Configurazione salvata.</p>}
      <button className={styles.bottone} disabled={pending} type="submit">
        Salva
      </button>
    </form>
  );
}

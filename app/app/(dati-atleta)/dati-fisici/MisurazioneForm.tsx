"use client";

import { useActionState, useState } from "react";
import { inserisciMisurazioneAction } from "./actions";
import { PARAMETRI_STANDARD } from "@/lib/misurazioni";
import styles from "./dati-fisici.module.css";

const ALTRO = "";

// Story 9.16 (AC #1, #2, #3): selettore di parametro standard - "Altro"
// (valore vuoto, selezionato di default) preserva il comportamento odierno
// (Story 6.1, tipo/unitaMisura/valore liberi ed editabili). Selezionando un
// parametro standard tipo/unitaMisura diventano precompilati/read-only, e i
// parametri a 3 tentativi (Salto con rincorsa/Salto a muro) mostrano tre
// campi valore invece di uno - tutti con lo stesso name="valore"
// (FormData.getAll("valore") in actions.ts li raccoglie in ordine).
export function MisurazioneForm({ atletaId }: { atletaId: string }) {
  const [state, formAction, pending] = useActionState(
    inserisciMisurazioneAction,
    undefined
  );
  const [parametroSelezionato, setParametroSelezionato] = useState(ALTRO);

  const parametro = PARAMETRI_STANDARD.find((p) => p.tipo === parametroSelezionato);

  return (
    <form action={formAction}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <div className={styles.campoSelettore}>
        <label htmlFor="misurazione-parametro">Parametro</label>
        <select
          id="misurazione-parametro"
          value={parametroSelezionato}
          onChange={(e) => setParametroSelezionato(e.target.value)}
        >
          <option value={ALTRO}>Altro (personalizzato)</option>
          {PARAMETRI_STANDARD.map((p) => (
            <option key={p.tipo} value={p.tipo}>
              {p.tipo}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label>
          Tipo
          <input
            type="text"
            name="tipo"
            placeholder="es. Altezza"
            defaultValue={parametro?.tipo}
            key={`tipo-${parametroSelezionato}`}
            readOnly={!!parametro}
            required
          />
        </label>
      </div>
      {parametro?.tentativi === 3 ? (
        // Review fix: key per campo legata al parametro selezionato - senza,
        // React riusa lo stesso nodo DOM passando da un parametro a 3
        // tentativi all'altro (es. Salto con rincorsa -> Salto a muro) e un
        // valore digitato in precedenza resta silenziosamente nel campo.
        <div className={styles.campiTentativo}>
          <div className={styles.campo}>
            <label>
              Tentativo 1
              <input
                type="text"
                name="valore"
                placeholder="es. 40"
                key={`valore-1-${parametroSelezionato}`}
                required
              />
            </label>
          </div>
          <div className={styles.campo}>
            <label>
              Tentativo 2
              <input
                type="text"
                name="valore"
                placeholder="es. 42"
                key={`valore-2-${parametroSelezionato}`}
                required
              />
            </label>
          </div>
          <div className={styles.campo}>
            <label>
              Tentativo 3
              <input
                type="text"
                name="valore"
                placeholder="es. 38"
                key={`valore-3-${parametroSelezionato}`}
                required
              />
            </label>
          </div>
        </div>
      ) : (
        <div className={styles.campo}>
          <label>
            Valore
            <input
              type="text"
              name="valore"
              placeholder="es. 178"
              key={`valore-${parametroSelezionato}`}
              required
            />
          </label>
        </div>
      )}
      <div className={styles.campo}>
        <label>
          Unità di misura
          <input
            type="text"
            name="unitaMisura"
            placeholder="es. cm"
            defaultValue={parametro?.unitaMisura}
            key={`unitaMisura-${parametroSelezionato}`}
            readOnly={!!parametro}
            required
          />
        </label>
      </div>
      <div className={styles.campo}>
        <label>
          Data
          <input type="date" name="data" required />
        </label>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Misurazione salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva misurazione
      </button>
    </form>
  );
}

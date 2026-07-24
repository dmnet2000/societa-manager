"use client";

import { useActionState, useEffect, useRef } from "react";
import { assegnaAllenatore, assegnaAtleta } from "./actions";
import styles from "./gruppi.module.css";

type Allenatore = {
  id: string;
  nome: string;
};

type Atleta = {
  id: string;
  nome: string;
};

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
  allenatori: Allenatore[];
  atlete: Atleta[];
};

export function GruppoRow({
  gruppo,
  allenatoriDisponibili,
  atleteDisponibili,
}: {
  gruppo: Gruppo;
  allenatoriDisponibili: Allenatore[];
  atleteDisponibili: Atleta[];
}) {
  const [allenatoreState, allenatoreFormAction, allenatorePending] =
    useActionState(assegnaAllenatore, undefined);
  const allenatoreFormRef = useRef<HTMLFormElement>(null);

  const [atletaState, atletaFormAction, atletaPending] = useActionState(
    assegnaAtleta,
    undefined
  );
  const atletaFormRef = useRef<HTMLFormElement>(null);

  // Review fix: senza il reset, il <select> restava sull'ultimo Allenatore
  // scelto dopo un'assegnazione riuscita, a differenza di NuovoGruppoForm/
  // NuovoCampoForm (Story 2.1/2.2) che resettano il form al successo.
  useEffect(() => {
    if (allenatoreState && "success" in allenatoreState) {
      allenatoreFormRef.current?.reset();
    }
  }, [allenatoreState]);

  // Stesso pattern di reset applicato al form Atlete (Story 2.4).
  useEffect(() => {
    if (atletaState && "success" in atletaState) {
      atletaFormRef.current?.reset();
    }
  }, [atletaState]);

  return (
    <tr>
      <td>{gruppo.nome}</td>
      <td>{gruppo.categoria}</td>
      <td>
        <ul className={styles.listaAssegnati}>
          {gruppo.allenatori.map((allenatore) => (
            <li key={allenatore.id}>{allenatore.nome}</li>
          ))}
        </ul>
        <form
          ref={allenatoreFormRef}
          action={allenatoreFormAction}
          className={styles.formCompatto}
        >
          <input type="hidden" name="gruppoId" value={gruppo.id} />
          <label htmlFor={`assegna-allenatore-${gruppo.id}`}>
            Assegna Allenatore
          </label>
          <select id={`assegna-allenatore-${gruppo.id}`} name="allenatoreId" required>
            <option value="">Seleziona...</option>
            {allenatoriDisponibili.map((allenatore) => (
              <option key={allenatore.id} value={allenatore.id}>
                {allenatore.nome}
              </option>
            ))}
          </select>
          {allenatoreState && "error" in allenatoreState && (
            <p role="alert" className={styles.errore}>
              {allenatoreState.error.message}
            </p>
          )}
          <button
            disabled={allenatorePending}
            type="submit"
            className={styles.bottoneCompatto}
          >
            Assegna
          </button>
        </form>
      </td>
      <td>
        <ul className={styles.listaAssegnati}>
          {gruppo.atlete.map((atleta) => (
            <li key={atleta.id}>{atleta.nome}</li>
          ))}
        </ul>
        <form
          ref={atletaFormRef}
          action={atletaFormAction}
          className={styles.formCompatto}
        >
          <input type="hidden" name="gruppoId" value={gruppo.id} />
          <label htmlFor={`assegna-atleta-${gruppo.id}`}>Assegna Atleta</label>
          <select id={`assegna-atleta-${gruppo.id}`} name="atletaId" required>
            <option value="">Seleziona...</option>
            {atleteDisponibili.map((atleta) => (
              <option key={atleta.id} value={atleta.id}>
                {atleta.nome}
              </option>
            ))}
          </select>
          {atletaState && "error" in atletaState && (
            <p role="alert" className={styles.errore}>
              {atletaState.error.message}
            </p>
          )}
          <button
            disabled={atletaPending}
            type="submit"
            className={styles.bottoneCompatto}
          >
            Assegna
          </button>
        </form>
      </td>
    </tr>
  );
}

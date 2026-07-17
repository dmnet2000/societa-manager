"use client";

import { useActionState, useEffect, useRef } from "react";
import { assegnaAllenatore } from "./actions";

type Allenatore = {
  id: string;
  nome: string;
};

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
  allenatori: Allenatore[];
};

export function GruppoRow({
  gruppo,
  allenatoriDisponibili,
}: {
  gruppo: Gruppo;
  allenatoriDisponibili: Allenatore[];
}) {
  const [state, formAction, pending] = useActionState(
    assegnaAllenatore,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Review fix: senza il reset, il <select> restava sull'ultimo Allenatore
  // scelto dopo un'assegnazione riuscita, a differenza di NuovoGruppoForm/
  // NuovoCampoForm (Story 2.1/2.2) che resettano il form al successo.
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <tr>
      <td>{gruppo.nome}</td>
      <td>{gruppo.categoria}</td>
      <td>
        <ul>
          {gruppo.allenatori.map((allenatore) => (
            <li key={allenatore.id}>{allenatore.nome}</li>
          ))}
        </ul>
        <form ref={formRef} action={formAction}>
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
          {state && "error" in state && <p role="alert">{state.error.message}</p>}
          <button disabled={pending} type="submit">
            Assegna
          </button>
        </form>
      </td>
    </tr>
  );
}

"use client";

import { useActionState } from "react";
import { registraPresenze } from "./actions";

type AtletaMinima = { id: string; nome: string };

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
      <ul>
        {roster.map((atleta) => (
          <li key={atleta.id}>
            <input type="hidden" name="rosterAtletaId" value={atleta.id} />
            <label>
              <input
                type="checkbox"
                name="presenteAtletaId"
                value={atleta.id}
                defaultChecked={presentiSet.has(atleta.id)}
              />
              {atleta.nome}
            </label>
          </li>
        ))}
      </ul>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && <p role="status">Presenze salvate.</p>}
      <button disabled={pending} type="submit">
        Salva presenze
      </button>
    </form>
  );
}

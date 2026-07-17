"use client";

import { useActionState } from "react";
import { aggiornaPalestra } from "./actions";
import { CampoRow } from "./CampoRow";
import { NuovoCampoForm } from "./NuovoCampoForm";

type Campo = {
  id: string;
  nome: string;
};

type Palestra = {
  id: string;
  nome: string;
  indirizzo: string | null;
  campi: Campo[];
};

export function PalestraRow({ palestra }: { palestra: Palestra }) {
  const [state, formAction, pending] = useActionState(
    aggiornaPalestra,
    undefined
  );

  return (
    <article>
      <form action={formAction}>
        <input type="hidden" name="id" value={palestra.id} />
        <div>
          <label htmlFor={`palestra-nome-${palestra.id}`}>Nome</label>
          <input
            id={`palestra-nome-${palestra.id}`}
            name="nome"
            type="text"
            defaultValue={palestra.nome}
            required
          />
        </div>
        <div>
          <label htmlFor={`palestra-indirizzo-${palestra.id}`}>Indirizzo</label>
          <input
            id={`palestra-indirizzo-${palestra.id}`}
            name="indirizzo"
            type="text"
            defaultValue={palestra.indirizzo ?? ""}
          />
        </div>
        {state && "error" in state && <p role="alert">{state.error.message}</p>}
        <button disabled={pending} type="submit">
          Salva Palestra
        </button>
      </form>

      <h3>Campi</h3>
      <ul>
        {palestra.campi.map((campo) => (
          <CampoRow key={campo.id} campo={campo} />
        ))}
      </ul>
      <NuovoCampoForm palestraId={palestra.id} />
    </article>
  );
}

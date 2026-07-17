"use client";

import { useActionState } from "react";
import { aggiornaCampo } from "./actions";

type Campo = {
  id: string;
  nome: string;
};

export function CampoRow({ campo }: { campo: Campo }) {
  const [state, formAction, pending] = useActionState(aggiornaCampo, undefined);

  return (
    <li>
      <form action={formAction}>
        <input type="hidden" name="id" value={campo.id} />
        <label htmlFor={`campo-nome-${campo.id}`}>Nome Campo</label>
        <input
          id={`campo-nome-${campo.id}`}
          name="nome"
          type="text"
          defaultValue={campo.nome}
          required
        />
        {state && "error" in state && <p role="alert">{state.error.message}</p>}
        <button disabled={pending} type="submit">
          Salva
        </button>
      </form>
    </li>
  );
}

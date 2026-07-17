"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaCampo } from "./actions";

export function NuovoCampoForm({ palestraId }: { palestraId: string }) {
  const [state, formAction, pending] = useActionState(creaCampo, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="palestraId" value={palestraId} />
      <label htmlFor={`nuovo-campo-nome-${palestraId}`}>Nuovo Campo</label>
      <input
        id={`nuovo-campo-nome-${palestraId}`}
        name="nome"
        type="text"
        required
      />
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      <button disabled={pending} type="submit">
        Aggiungi Campo
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaPalestra } from "./actions";

export function NuovaPalestraForm() {
  const [state, formAction, pending] = useActionState(creaPalestra, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div>
        <label htmlFor="nuova-palestra-nome">Nome</label>
        <input id="nuova-palestra-nome" name="nome" type="text" required />
      </div>
      <div>
        <label htmlFor="nuova-palestra-indirizzo">Indirizzo</label>
        <input id="nuova-palestra-indirizzo" name="indirizzo" type="text" />
      </div>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && <p role="status">Palestra creata.</p>}
      <button disabled={pending} type="submit">
        Crea Palestra
      </button>
    </form>
  );
}

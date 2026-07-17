"use client";

import { useActionState } from "react";
import { precaricaAllenatore } from "./actions";

export default function PrecaricamentoAllenatoriPage() {
  const [state, formAction, pending] = useActionState(
    precaricaAllenatore,
    undefined
  );

  return (
    <main>
      <h1>Precaricamento Allenatori</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="precarica-nome">Nome</label>
          <input id="precarica-nome" name="nome" type="text" required />
        </div>
        <div>
          <label htmlFor="precarica-cf">Codice Fiscale</label>
          <input
            id="precarica-cf"
            name="codiceFiscale"
            type="text"
            required
          />
        </div>
        {state && "error" in state && (
          <p role="alert">{state.error.message}</p>
        )}
        {state && "success" in state && (
          <p role="status">Allenatore precaricato.</p>
        )}
        <button disabled={pending} type="submit">
          Precarica
        </button>
      </form>
    </main>
  );
}

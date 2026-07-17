"use client";

import { useActionState, useEffect, useRef } from "react";
import { creaUtente } from "./actions";

const RUOLI = [
  { value: "ALLENATORE", label: "Allenatore" },
  { value: "ATLETA", label: "Atleta" },
  { value: "GENITORE", label: "Genitore" },
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
  { value: "ADMIN", label: "Admin" },
];

export function NuovoUtenteForm() {
  const [state, formAction, pending] = useActionState(creaUtente, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div>
        <label htmlFor="nuovo-utente-email">Email</label>
        <input
          id="nuovo-utente-email"
          name="email"
          type="email"
          autoComplete="off"
          required
        />
      </div>
      <div>
        <label htmlFor="nuovo-utente-password">Password</label>
        <input
          id="nuovo-utente-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <fieldset>
        <legend>Ruolo (uno o più)</legend>
        {RUOLI.map((ruolo) => (
          <label key={ruolo.value}>
            <input type="checkbox" name="ruoli" value={ruolo.value} />
            {ruolo.label}
          </label>
        ))}
      </fieldset>
      {state && "error" in state && (
        <p role="alert">{state.error.message}</p>
      )}
      {state && "success" in state && <p role="status">Utente creato.</p>}
      <button disabled={pending} type="submit">
        Crea utente
      </button>
    </form>
  );
}

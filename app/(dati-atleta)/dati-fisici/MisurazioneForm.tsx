"use client";

import { useActionState } from "react";
import { inserisciMisurazioneAction } from "./actions";

export function MisurazioneForm({ atletaId }: { atletaId: string }) {
  const [state, formAction, pending] = useActionState(
    inserisciMisurazioneAction,
    undefined
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <label>
        Tipo
        <input type="text" name="tipo" placeholder="es. Altezza" required />
      </label>
      <label>
        Valore
        <input type="text" name="valore" placeholder="es. 178" required />
      </label>
      <label>
        Unità di misura
        <input type="text" name="unitaMisura" placeholder="es. cm" required />
      </label>
      <label>
        Data
        <input type="date" name="data" required />
      </label>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && (
        <p role="status">Misurazione salvata.</p>
      )}
      <button disabled={pending} type="submit">
        Salva misurazione
      </button>
    </form>
  );
}

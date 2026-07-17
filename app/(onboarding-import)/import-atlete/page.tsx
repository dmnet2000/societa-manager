"use client";

import { useActionState } from "react";
import { importaAtlete } from "./actions";

export default function ImportAtletePage() {
  const [state, formAction, pending] = useActionState(importaAtlete, undefined);

  return (
    <main>
      <h1>Import archivio Atlete</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="import-atlete-file">File Excel export federale</label>
          <input
            id="import-atlete-file"
            name="file"
            type="file"
            accept=".xlsx"
            required
          />
        </div>
        {state && "error" in state && (
          <p role="alert">{state.error.message}</p>
        )}
        <button disabled={pending} type="submit">
          Importa
        </button>
      </form>

      {state && "success" in state && (
        <section role="status">
          <h2>Riepilogo import</h2>
          <p>Atlete create: {state.create}</p>
          <p>Atlete aggiornate: {state.aggiornate}</p>
          <p>Atlete riportate (Under 13): {state.riportate}</p>
          <p>Righe scartate: {state.scartate.length}</p>
          {state.scartate.length > 0 && (
            <ul>
              {state.scartate.map((riga) => (
                <li key={riga.numeroRiga}>
                  Riga {riga.numeroRiga}: {riga.motivo}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

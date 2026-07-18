"use client";

import { useActionState } from "react";
import { salvaConfigurazione } from "./actions";
import type { ConfigurazioneSmtpSenzaPassword } from "@/lib/db-rls/configurazione-smtp";

// La password non viene mai precompilata (Prerequisito #3 della storia):
// vuota di default, con un'etichetta che chiarisce che lasciarla vuota non
// la modifica - obbligatoria solo se non esiste ancora una configurazione.
// Il tipo del prop esclude gia' `password` (review fix, mai passarla da un
// Server a un Client Component - vedi rimuoviPassword in page.tsx).
export function ConfigurazioneSmtpForm({
  configurazioneEsistente,
}: {
  configurazioneEsistente: ConfigurazioneSmtpSenzaPassword | null;
}) {
  const [state, formAction, pending] = useActionState(
    salvaConfigurazione,
    undefined
  );

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="smtp-host">Host</label>
        <input
          id="smtp-host"
          name="host"
          type="text"
          defaultValue={configurazioneEsistente?.host ?? ""}
          required
        />
      </div>
      <div>
        <label htmlFor="smtp-porta">Porta</label>
        <input
          id="smtp-porta"
          name="porta"
          type="number"
          defaultValue={configurazioneEsistente?.porta ?? 465}
          required
        />
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            name="sicura"
            defaultChecked={configurazioneEsistente?.sicura ?? true}
          />
          Connessione SSL/TLS (tipicamente per la porta 465)
        </label>
      </div>
      <div>
        <label htmlFor="smtp-utente">Utente</label>
        <input
          id="smtp-utente"
          name="utente"
          type="text"
          defaultValue={configurazioneEsistente?.utente ?? ""}
          required
        />
      </div>
      <div>
        <label htmlFor="smtp-password">
          Password
          {configurazioneEsistente
            ? " (lascia vuoto per non modificarla)"
            : ""}
        </label>
        <input
          id="smtp-password"
          name="password"
          type="password"
          autoComplete="off"
          required={!configurazioneEsistente}
        />
      </div>
      <div>
        <label htmlFor="smtp-mittente">Indirizzo mittente</label>
        <input
          id="smtp-mittente"
          name="mittente"
          type="email"
          defaultValue={configurazioneEsistente?.mittente ?? ""}
          required
        />
      </div>
      <div>
        <label htmlFor="smtp-nome-mittente">Nome mittente (opzionale)</label>
        <input
          id="smtp-nome-mittente"
          name="nomeMittente"
          type="text"
          defaultValue={configurazioneEsistente?.nomeMittente ?? ""}
        />
      </div>
      {state && "error" in state && <p role="alert">{state.error.message}</p>}
      {state && "success" in state && (
        <p role="status">Configurazione salvata.</p>
      )}
      <button disabled={pending} type="submit">
        Salva configurazione
      </button>
    </form>
  );
}

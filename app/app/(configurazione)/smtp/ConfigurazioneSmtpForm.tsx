"use client";

import { useActionState } from "react";
import { salvaConfigurazione } from "./actions";
import type { ConfigurazioneSmtpSenzaPassword } from "@/lib/db-rls/configurazione-smtp";
import styles from "./smtp.module.css";

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
      <div className={styles.campo}>
        <label htmlFor="smtp-host">Host</label>
        <input
          id="smtp-host"
          name="host"
          type="text"
          defaultValue={configurazioneEsistente?.host ?? ""}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="smtp-porta">Porta</label>
        <input
          id="smtp-porta"
          name="porta"
          type="number"
          defaultValue={configurazioneEsistente?.porta ?? 465}
          required
        />
      </div>
      <div className={styles.campo}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="sicura"
            defaultChecked={configurazioneEsistente?.sicura ?? true}
          />
          Connessione SSL/TLS (tipicamente per la porta 465)
        </label>
      </div>
      <div className={styles.campo}>
        <label htmlFor="smtp-utente">Utente</label>
        <input
          id="smtp-utente"
          name="utente"
          type="text"
          defaultValue={configurazioneEsistente?.utente ?? ""}
          required
        />
      </div>
      <div className={styles.campo}>
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
      <div className={styles.campo}>
        <label htmlFor="smtp-mittente">Indirizzo mittente</label>
        <input
          id="smtp-mittente"
          name="mittente"
          type="email"
          defaultValue={configurazioneEsistente?.mittente ?? ""}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="smtp-nome-mittente">Nome mittente (opzionale)</label>
        <input
          id="smtp-nome-mittente"
          name="nomeMittente"
          type="text"
          defaultValue={configurazioneEsistente?.nomeMittente ?? ""}
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Configurazione salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva configurazione
      </button>
    </form>
  );
}

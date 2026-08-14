"use client";

import { useActionState } from "react";
import { salvaTokenFacebookAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.13: mirror strutturale di ConfigurazioneSmtpForm.tsx (campo
// password) - il token non viene MAI precompilato (AC #4, a differenza di
// PaginaFacebookForm.tsx/EmailSegreteriaForm.tsx, che precompilano perche'
// quei valori non sono segreti): il prop non riceve mai il valore reale,
// solo lo stato "configurato o no". `required={!configurato}` impedisce a
// livello di browser un primo salvataggio vuoto (senza, la Server Action
// tratterebbe un submit vuoto come "non modificare" - corretto per un
// aggiornamento, ma su un primo salvataggio non ci sarebbe nulla da non
// modificare, un submit riuscito senza aver salvato nulla sarebbe
// fuorviante).
export function TokenFacebookForm({
  configurato,
  ultimaLetturaOk,
}: {
  configurato: boolean;
  ultimaLetturaOk: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    salvaTokenFacebookAction,
    undefined
  );

  return (
    <form action={formAction}>
      <p className={styles.statoToken}>
        {configurato ? "Token configurato" : "Token non configurato"}
        {configurato && !ultimaLetturaOk && " — ultima lettura fallita"}
      </p>
      <div className={styles.campo}>
        <label htmlFor="facebook-token">
          Token di accesso
          {configurato ? " (lascia vuoto per non modificarlo)" : ""}
        </label>
        <input
          id="facebook-token"
          name="accessToken"
          type="password"
          autoComplete="off"
          required={!configurato}
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Token Facebook salvato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

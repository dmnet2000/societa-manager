"use client";

import { useActionState } from "react";
import { salvaContattiPubbliciAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.11: un solo form con i 3 campi insieme (indirizzo/telefono/email
// pubblici), un solo pulsante "Salva" - mirror strutturale di
// EmailSegreteriaForm.tsx/PaginaFacebookForm.tsx, ma su piu' campi.
export function ContattiPubbliciForm({
  indirizzoSedeAttuale,
  telefonoPubblicoAttuale,
  emailPubblicaAttuale,
}: {
  indirizzoSedeAttuale: string | null;
  telefonoPubblicoAttuale: string | null;
  emailPubblicaAttuale: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    salvaContattiPubbliciAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="indirizzo-sede">Indirizzo sede</label>
        <input
          id="indirizzo-sede"
          name="indirizzoSede"
          type="text"
          maxLength={300}
          defaultValue={indirizzoSedeAttuale ?? ""}
          placeholder="es. Via dello Sport 1, 12345 Città (PV)"
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="telefono-pubblico">Telefono</label>
        <input
          id="telefono-pubblico"
          name="telefonoPubblico"
          type="tel"
          maxLength={30}
          defaultValue={telefonoPubblicoAttuale ?? ""}
          placeholder="es. +39 012 3456789"
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="email-pubblica">Email pubblica</label>
        <input
          id="email-pubblica"
          name="emailPubblica"
          type="email"
          maxLength={254}
          defaultValue={emailPubblicaAttuale ?? ""}
          placeholder="es. info@miasocieta.it"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Contatti pubblici salvati.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

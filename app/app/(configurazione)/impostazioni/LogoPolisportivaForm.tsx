"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaLogoPolisportivaAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.20: mirror esatto di FotoHeroForm.tsx - stessa struttura, cambia
// solo testo/action.
export function LogoPolisportivaForm() {
  const [state, formAction, pending] = useActionState(
    caricaLogoPolisportivaAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="logo-polisportiva-file">Logo Polisportiva (PNG o JPG, max 2MB)</label>
        <input
          id="logo-polisportiva-file"
          name="file"
          type="file"
          accept=".png,.jpg,.jpeg"
          required
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Logo caricato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Carica logo
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaFotoHeroAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.14: mirror esatto di LogoForm.tsx (app/(configurazione)/logo/) -
// stessa struttura, cambia solo testo/action/stile (classi condivise di
// questa pagina, non un modulo CSS dedicato come /app/logo).
export function FotoHeroForm() {
  const [state, formAction, pending] = useActionState(
    caricaFotoHeroAction,
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
        <label htmlFor="foto-hero-file">Foto sfondo hero (PNG o JPG, max 2MB)</label>
        <input
          id="foto-hero-file"
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
          Foto caricata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Carica foto
      </button>
    </form>
  );
}

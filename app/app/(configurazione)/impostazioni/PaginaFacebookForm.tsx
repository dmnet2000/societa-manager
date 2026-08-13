"use client";

import { useActionState } from "react";
import { salvaUrlPaginaFacebookAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.5: mirror 1:1 di EmailSegreteriaForm.tsx.
export function PaginaFacebookForm({ urlAttuale }: { urlAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaUrlPaginaFacebookAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="url-pagina-facebook">URL Pagina Facebook</label>
        <input
          id="url-pagina-facebook"
          name="urlPaginaFacebook"
          type="url"
          maxLength={500}
          defaultValue={urlAttuale ?? ""}
          placeholder="es. https://www.facebook.com/miasocieta"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Pagina Facebook salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

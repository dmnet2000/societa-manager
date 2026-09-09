"use client";

import { useActionState } from "react";
import { salvaUrlPaginaInstagramAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.29: mirror di PaginaFacebookForm.tsx, ma SENZA lo stato/avviso
// "Token potrebbe non corrispondere" - Instagram non ha alcun Token/embed
// (solo un link semplice), quindi il campo resta un semplice defaultValue
// non controlled, stesso principio gia' in uso da SitoPolisportivaForm.tsx.
export function PaginaInstagramForm({ urlAttuale }: { urlAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaUrlPaginaInstagramAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="url-pagina-instagram">URL Pagina Instagram</label>
        <input
          id="url-pagina-instagram"
          name="urlPaginaInstagram"
          type="url"
          maxLength={500}
          defaultValue={urlAttuale ?? ""}
          placeholder="es. https://www.instagram.com/miasocieta"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Pagina Instagram salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

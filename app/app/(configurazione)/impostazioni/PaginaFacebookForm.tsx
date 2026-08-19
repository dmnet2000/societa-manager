"use client";

import { useActionState, useState } from "react";
import { salvaUrlPaginaFacebookAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 18.5: mirror 1:1 di EmailSegreteriaForm.tsx.
export function PaginaFacebookForm({ urlAttuale }: { urlAttuale: string | null }) {
  const [state, formAction, pending] = useActionState(
    salvaUrlPaginaFacebookAction,
    undefined
  );
  // Story 19.5 (AC #3): serve solo a sapere se l'ultimo submit portava un
  // valore non vuoto, per condizionare l'avviso sotto - un ref letto
  // durante il render violerebbe react-hooks/refs (verificato da `npm run
  // lint`), quindi il campo diventa controlled solo per questo.
  const [valore, setValore] = useState(urlAttuale ?? "");
  // Review fix: l'avviso leggeva "valore" (lo stato live del campo, che
  // cambia a ogni tasto) invece del valore DAVVERO inviato nell'ultimo
  // submit riuscito - un Utente poteva salvare con successo, vedere
  // l'avviso, poi modificare/svuotare il campo senza reinviare e vedere
  // l'avviso sparire pur restando il valore precedente (con Token
  // potenzialmente disallineato) quello davvero salvato sul server.
  // "valoreSalvato" si aggiorna solo al submit (onSubmit, non durante il
  // render), quindi resta legato al risultato mostrato in "state" finche'
  // non arriva un nuovo esito.
  const [valoreSalvato, setValoreSalvato] = useState<string | null>(null);

  return (
    <form action={formAction} onSubmit={() => setValoreSalvato(valore)}>
      <div className={styles.campo}>
        <label htmlFor="url-pagina-facebook">URL Pagina Facebook</label>
        <input
          id="url-pagina-facebook"
          name="urlPaginaFacebook"
          type="url"
          maxLength={500}
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          placeholder="es. https://www.facebook.com/miasocieta"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <>
          <p role="status" className={styles.successo}>
            Pagina Facebook salvata.
          </p>
          {/* Story 19.5 (AC #3): avviso mostrato solo se e' stato salvato un
              URL non vuoto - svuotare il campo rimuove la configurazione
              (nessuna nuova Pagina a cui il Token potrebbe non
              corrispondere piu'). Site Manager non ha accesso al Token
              (salvaTokenFacebookAction resta Admin/Dirigente-only), quindi
              non puo' risolvere da solo un eventuale disallineamento. */}
          {valoreSalvato?.trim() && (
            <p className={styles.avviso}>
              Il Token Facebook potrebbe non corrispondere più alla nuova
              Pagina: contatta un Admin per aggiornarlo se necessario.
            </p>
          )}
        </>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

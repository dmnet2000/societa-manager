"use client";

import { useActionState } from "react";
import {
  aggiornaVoceMenuPubblicoAction,
  impostaVisibileVoceMenuPubblicoAction,
  spostaVoceMenuPubblicoAction,
} from "./actions";
import styles from "./menu-pubblico.module.css";

type VoceMenuPubblico = {
  id: string;
  etichetta: string;
  url: string;
  visibile: boolean;
};

// Story 19.7: mirror strutturale di SponsorRow.tsx (Story 16.1) - tre
// <form>/useActionState indipendenti sulla stessa card (modifica, toggle
// visibilita', spostamento), stesso principio del toggle "attiva" di
// SponsorRow. "primo"/"ultimo" arrivano dal Server Component genitore
// (l'ordine e' gia' noto lato server) - disabilitano il bottone di
// spostamento sul margine, ma il vero cancello resta lato server
// (spostaVoceMenuPubblicoAction, che ignora una richiesta oltre il
// margine invece di fallire).
export function VoceMenuPubblicoRow({
  voce,
  primo,
  ultimo,
}: {
  voce: VoceMenuPubblico;
  primo: boolean;
  ultimo: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    aggiornaVoceMenuPubblicoAction,
    undefined
  );
  const [visibileState, visibileAction, visibilePending] = useActionState(
    impostaVisibileVoceMenuPubblicoAction,
    undefined
  );
  const [spostaState, spostaAction, spostaPending] = useActionState(
    spostaVoceMenuPubblicoAction,
    undefined
  );

  return (
    <article className={styles.card}>
      <div className={styles.intestazioneCard}>
        <span className={voce.visibile ? styles.badgeSuccesso : styles.badgeDanger}>
          {voce.visibile ? "Visibile" : "Nascosta"}
        </span>
        <div className={styles.azioniIntestazione}>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={voce.id} />
            <input type="hidden" name="direzione" value="su" />
            <button
              disabled={spostaPending || primo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${voce.etichetta}" più in alto`}
            >
              ↑
            </button>
          </form>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={voce.id} />
            <input type="hidden" name="direzione" value="giu" />
            <button
              disabled={spostaPending || ultimo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${voce.etichetta}" più in basso`}
            >
              ↓
            </button>
          </form>
          <form action={visibileAction}>
            <input type="hidden" name="id" value={voce.id} />
            <input type="hidden" name="visibile" value={String(!voce.visibile)} />
            <button disabled={visibilePending} type="submit" className={styles.bottoneSecondario}>
              {voce.visibile ? "Nascondi" : "Mostra"}
            </button>
          </form>
        </div>
      </div>
      {spostaState && "error" in spostaState && (
        <p role="alert" className={styles.errore}>
          {spostaState.error.message}
        </p>
      )}
      {visibileState && "error" in visibileState && (
        <p role="alert" className={styles.errore}>
          {visibileState.error.message}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="id" value={voce.id} />
        <div className={styles.campo}>
          <label htmlFor={`voce-etichetta-${voce.id}`}>Etichetta</label>
          <input
            id={`voce-etichetta-${voce.id}`}
            name="etichetta"
            type="text"
            maxLength={40}
            defaultValue={voce.etichetta}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`voce-url-${voce.id}`}>URL</label>
          <input
            id={`voce-url-${voce.id}`}
            name="url"
            type="text"
            maxLength={200}
            defaultValue={voce.url}
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
            Voce aggiornata.
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva voce
        </button>
      </form>
    </article>
  );
}

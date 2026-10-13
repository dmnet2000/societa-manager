"use client";

import { useActionState, useState } from "react";
import {
  aggiornaFederazioneAction,
  eliminaFederazioneAction,
  impostaAttivaFederazioneAction,
  spostaFederazioneAction,
} from "./actions";
import styles from "./federazioni.module.css";

type Federazione = {
  id: string;
  nome: string;
  sigla: string | null;
  attiva: boolean;
};

// Story 26.1: mirror strutturale di VoceMenuPubblicoRow.tsx (form
// indipendenti per modifica/toggle/spostamento sulla stessa card), piu'
// l'eliminazione con conferma in pagina (stato locale, mai window.confirm).
// "primo"/"ultimo" disabilitano lo spostamento sul margine, ma il vero
// cancello resta lato server (spostaFederazioneAction).
export function FederazioneRow({
  federazione,
  primo,
  ultimo,
}: {
  federazione: Federazione;
  primo: boolean;
  ultimo: boolean;
}) {
  const [state, formAction, pending] = useActionState(aggiornaFederazioneAction, undefined);
  const [attivaState, attivaAction, attivaPending] = useActionState(
    impostaAttivaFederazioneAction,
    undefined
  );
  const [spostaState, spostaAction, spostaPending] = useActionState(
    spostaFederazioneAction,
    undefined
  );
  const [eliminaState, eliminaAction, eliminaPending] = useActionState(
    eliminaFederazioneAction,
    undefined
  );
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);

  return (
    <article className={styles.card}>
      <div className={styles.intestazioneCard}>
        <span className={federazione.attiva ? styles.badgeSuccesso : styles.badgeDanger}>
          {federazione.attiva ? "Attiva" : "Disattivata"}
        </span>
        <div className={styles.azioniIntestazione}>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={federazione.id} />
            <input type="hidden" name="direzione" value="su" />
            <button
              disabled={spostaPending || primo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${federazione.nome}" più in alto`}
            >
              ↑
            </button>
          </form>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={federazione.id} />
            <input type="hidden" name="direzione" value="giu" />
            <button
              disabled={spostaPending || ultimo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${federazione.nome}" più in basso`}
            >
              ↓
            </button>
          </form>
          <form action={attivaAction}>
            <input type="hidden" name="id" value={federazione.id} />
            <input type="hidden" name="attiva" value={String(!federazione.attiva)} />
            <button disabled={attivaPending} type="submit" className={styles.bottoneSecondario}>
              {federazione.attiva ? "Disattiva" : "Riattiva"}
            </button>
          </form>
          {!confermaEliminazione && (
            // Review fix: disabilitato mentre un'eliminazione e' in corso -
            // il form di conferma si chiude subito all'invio, senza questo
            // si potrebbe riaprire e reinviare prima della risposta.
            <button
              type="button"
              disabled={eliminaPending}
              className={styles.bottoneSecondario}
              onClick={() => setConfermaEliminazione(true)}
            >
              Elimina
            </button>
          )}
        </div>
      </div>
      {confermaEliminazione && (
        <form
          action={(formData) => {
            setConfermaEliminazione(false);
            eliminaAction(formData);
          }}
          className={styles.confermaEliminazione}
        >
          <input type="hidden" name="id" value={federazione.id} />
          <p>Eliminare definitivamente &quot;{federazione.nome}&quot;?</p>
          <div className={styles.azioniIntestazione}>
            <button disabled={eliminaPending} type="submit" className={styles.bottonePericolo}>
              Conferma eliminazione
            </button>
            <button
              type="button"
              className={styles.bottoneSecondario}
              onClick={() => setConfermaEliminazione(false)}
            >
              Annulla
            </button>
          </div>
        </form>
      )}
      {spostaState && "error" in spostaState && (
        <p role="alert" className={styles.errore}>
          {spostaState.error.message}
        </p>
      )}
      {attivaState && "error" in attivaState && (
        <p role="alert" className={styles.errore}>
          {attivaState.error.message}
        </p>
      )}
      {eliminaState && "error" in eliminaState && (
        <p role="alert" className={styles.errore}>
          {eliminaState.error.message}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="id" value={federazione.id} />
        <div className={styles.campo}>
          <label htmlFor={`federazione-nome-${federazione.id}`}>Nome</label>
          <input
            id={`federazione-nome-${federazione.id}`}
            name="nome"
            type="text"
            maxLength={80}
            defaultValue={federazione.nome}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`federazione-sigla-${federazione.id}`}>Sigla (facoltativa)</label>
          <input
            id={`federazione-sigla-${federazione.id}`}
            name="sigla"
            type="text"
            maxLength={20}
            defaultValue={federazione.sigla ?? ""}
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        {state && "success" in state && (
          <p role="status" className={styles.successo}>
            Federazione aggiornata.
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva federazione
        </button>
      </form>
    </article>
  );
}

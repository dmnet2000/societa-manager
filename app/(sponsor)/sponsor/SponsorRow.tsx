"use client";

import { useActionState } from "react";
import { aggiornaSponsor, impostaAttivaSponsor } from "./actions";
import styles from "./sponsor.module.css";

type Sponsor = {
  id: string;
  nome: string;
  tipo: string;
  descrizione: string;
  linkEsterno: string | null;
  attiva: boolean;
  updatedAt: string;
  immagineUrl: string;
};

export function SponsorRow({ sponsor }: { sponsor: Sponsor }) {
  const [state, formAction, pending] = useActionState(aggiornaSponsor, undefined);
  const [toggleState, toggleAction, togglePending] = useActionState(
    impostaAttivaSponsor,
    undefined
  );

  return (
    <article className={styles.card}>
      <div className={styles.intestazioneCard}>
        <span className={sponsor.attiva ? styles.badgeSuccesso : styles.badgeDanger}>
          {sponsor.attiva ? "Attivo" : "Disattivato"}
        </span>
        <form action={toggleAction}>
          <input type="hidden" name="id" value={sponsor.id} />
          <input type="hidden" name="attiva" value={String(!sponsor.attiva)} />
          <button disabled={togglePending} type="submit" className={styles.bottoneSecondario}>
            {sponsor.attiva ? "Disattiva" : "Riattiva"}
          </button>
        </form>
      </div>
      {toggleState && "error" in toggleState && (
        <p role="alert" className={styles.errore}>
          {toggleState.error.message}
        </p>
      )}

      <img
        src={`${sponsor.immagineUrl}?v=${encodeURIComponent(sponsor.updatedAt)}`}
        alt={`Immagine di ${sponsor.nome}`}
        className={styles.anteprimaImmagine}
      />

      <form action={formAction}>
        <input type="hidden" name="id" value={sponsor.id} />
        <div className={styles.campo}>
          <label htmlFor={`sponsor-nome-${sponsor.id}`}>Nome</label>
          <input
            id={`sponsor-nome-${sponsor.id}`}
            name="nome"
            type="text"
            defaultValue={sponsor.nome}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`sponsor-tipo-${sponsor.id}`}>Tipo</label>
          <select
            id={`sponsor-tipo-${sponsor.id}`}
            name="tipo"
            defaultValue={sponsor.tipo}
            required
          >
            <option value="BANNER">Banner pubblicitario</option>
            <option value="CONVENZIONE">Convenzione</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor={`sponsor-descrizione-${sponsor.id}`}>Descrizione</label>
          <textarea
            id={`sponsor-descrizione-${sponsor.id}`}
            name="descrizione"
            defaultValue={sponsor.descrizione}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`sponsor-link-${sponsor.id}`}>Link esterno (opzionale)</label>
          <input
            id={`sponsor-link-${sponsor.id}`}
            name="linkEsterno"
            type="url"
            defaultValue={sponsor.linkEsterno ?? ""}
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`sponsor-file-${sponsor.id}`}>
            Nuova immagine (opzionale, PNG o JPG, max 2MB)
          </label>
          <input
            id={`sponsor-file-${sponsor.id}`}
            name="file"
            type="file"
            accept=".png,.jpg,.jpeg"
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        {state && "success" in state && (
          <p role="status" className={styles.successo}>
            Sponsor aggiornato.
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva Sponsor
        </button>
      </form>
    </article>
  );
}

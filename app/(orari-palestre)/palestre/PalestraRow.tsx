"use client";

import { useActionState } from "react";
import { aggiornaPalestra } from "./actions";
import { CampoRow } from "./CampoRow";
import { NuovoCampoForm } from "./NuovoCampoForm";
import { costruisciLinkMappaIncorporata, costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import styles from "./palestre.module.css";

type Campo = {
  id: string;
  nome: string;
};

type Palestra = {
  id: string;
  nome: string;
  indirizzo: string | null;
  latitudine: number | null;
  longitudine: number | null;
  campi: Campo[];
};

export function PalestraRow({ palestra }: { palestra: Palestra }) {
  const [state, formAction, pending] = useActionState(
    aggiornaPalestra,
    undefined
  );
  const linkNaviga = costruisciLinkNaviga(palestra);
  const linkMappaIncorporata = costruisciLinkMappaIncorporata(palestra);
  // Nessun link grezzo salvato a DB (solo le coordinate estratte) - il campo
  // di modifica va ripopolato ricostruendo un link Maps canonico dalle
  // coordinate salvate, cosi' l'Admin vede "qualcosa" invece di un campo
  // vuoto quando riapre una Palestra gia' geolocalizzata. Riusa
  // costruisciLinkNaviga (solo con le coordinate, mai con indirizzo: altrimenti
  // un semplice re-save senza toccare il campo proverebbe a "parsare" un
  // indirizzo testuale come se fosse un link Maps, fallendo la validazione)
  // invece di un URL costruito a mano - review fix, garantisce che il valore
  // resti sempre nello stesso formato riconosciuto da estraiCoordinateDaLinkMaps.
  const linkMapsIniziale =
    costruisciLinkNaviga({ latitudine: palestra.latitudine, longitudine: palestra.longitudine }) ?? "";

  return (
    <article className={styles.card}>
      {linkNaviga && (
        <a
          className={`${styles.bottone} ${styles.linkNaviga}`}
          href={linkNaviga}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Naviga verso ${palestra.nome}`}
        >
          Naviga
        </a>
      )}
      {linkMappaIncorporata && (
        <iframe
          className={styles.mappaIncorporata}
          src={linkMappaIncorporata}
          title={`Mappa di ${palestra.nome}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <form action={formAction}>
        <input type="hidden" name="id" value={palestra.id} />
        <div className={styles.campo}>
          <label htmlFor={`palestra-nome-${palestra.id}`}>Nome</label>
          <input
            id={`palestra-nome-${palestra.id}`}
            name="nome"
            type="text"
            defaultValue={palestra.nome}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`palestra-indirizzo-${palestra.id}`}>Indirizzo</label>
          <input
            id={`palestra-indirizzo-${palestra.id}`}
            name="indirizzo"
            type="text"
            defaultValue={palestra.indirizzo ?? ""}
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`palestra-link-maps-${palestra.id}`}>Link Google Maps (opzionale)</label>
          <input
            id={`palestra-link-maps-${palestra.id}`}
            name="linkMaps"
            type="url"
            defaultValue={linkMapsIniziale}
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva Palestra
        </button>
      </form>

      <h3>Campi</h3>
      <ul className={styles.campiLista}>
        {palestra.campi.map((campo) => (
          <CampoRow key={campo.id} campo={campo} />
        ))}
      </ul>
      <NuovoCampoForm palestraId={palestra.id} />
    </article>
  );
}

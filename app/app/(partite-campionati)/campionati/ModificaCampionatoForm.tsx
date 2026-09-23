"use client";

import { useActionState, useState } from "react";
import { aggiornaCampionato } from "./actions";
import styles from "./campionati.module.css";

// Story 10.8: toggle sola-lettura/modifica inline sullo stesso <li> già
// usato da ImportaGareForm/EliminaCampionatoForm - nessun ridisegno
// tabellare (a differenza di SlotRow.tsx/AllenatoreRow.tsx, Story 15.5/9.30:
// qui non c'è alcuna richiesta di ridisegno, la lista Campionati resta un
// <ul>/<li> semplice). Ricollasso automatico dopo un salvataggio riuscito
// con "adjust state during render" (stesso pattern di SlotRow.tsx/
// PartitaRow.tsx), non un useEffect con setState - violerebbe
// react-hooks/set-state-in-effect.
export function ModificaCampionatoForm({
  campionatoId,
  nome,
  linkFipav,
  colore,
}: {
  campionatoId: string;
  nome: string;
  linkFipav: string | null;
  // Richiesta utente (2026-09-24): colore opzionale per distinguere i
  // Campionati sul sito pubblico - stesso trattamento nullable di linkFipav.
  colore: string | null;
}) {
  const [state, formAction, pending] = useActionState(aggiornaCampionato, undefined);
  const [inModifica, setInModifica] = useState(false);
  // <input type="color"> non ha un valore "vuoto" nativo (mostra sempre un
  // colore concreto) - senza questo interruttore, aprire "Modifica" e
  // salvare senza toccare il colore imposterebbe silenziosamente il colore
  // di default mai scelto dall'utente. Deciso qui, non nel colore stesso.
  const [usaColore, setUsaColore] = useState(colore !== null);

  const [ultimoState, setUltimoState] = useState(state);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setInModifica(false);
      // Riallinea l'interruttore al nuovo `colore` (prop aggiornata dopo
      // revalidatePath) - senza questo, una riapertura di "Modifica" dopo
      // aver rimosso il colore mostrerebbe ancora la spunta attiva.
      setUsaColore(colore !== null);
    }
  }

  if (!inModifica) {
    return (
      <div className={styles.rigaCampionato}>
        {colore && (
          // Puramente decorativo (il nome accanto identifica gia' il
          // Campionato per uno screen reader) - stessa scelta gia' fatta per
          // ogni altro pallino/indicatore di sola decorazione del progetto.
          <span
            className={styles.pallinoColore}
            style={{ backgroundColor: colore }}
            aria-hidden="true"
          />
        )}
        <span>{nome}</span>
        {linkFipav && (
          <a
            href={linkFipav}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.linkFipav}
            aria-label={`Portale FIPAV del Campionato ${nome}`}
          >
            Portale FIPAV
          </a>
        )}
        <button
          type="button"
          onClick={() => setInModifica(true)}
          className={styles.bottoneCompatto}
          aria-label={`Modifica il Campionato ${nome}`}
        >
          Modifica
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.formCompatto}>
      <input type="hidden" name="campionatoId" value={campionatoId} />
      <label htmlFor={`modifica-campionato-nome-${campionatoId}`}>Nome</label>
      <input
        id={`modifica-campionato-nome-${campionatoId}`}
        name="nome"
        type="text"
        defaultValue={nome}
        required
      />
      <label htmlFor={`modifica-campionato-link-${campionatoId}`}>
        Link portale FIPAV (opzionale)
      </label>
      <input
        id={`modifica-campionato-link-${campionatoId}`}
        name="linkFipav"
        type="url"
        defaultValue={linkFipav ?? ""}
      />
      <label className={styles.checkboxColore}>
        <input
          type="checkbox"
          checked={usaColore}
          onChange={(evento) => setUsaColore(evento.target.checked)}
        />
        Colore personalizzato (per distinguerlo sul sito pubblico)
      </label>
      {usaColore && (
        <>
          <label htmlFor={`modifica-campionato-colore-${campionatoId}`}>Colore</label>
          <input
            id={`modifica-campionato-colore-${campionatoId}`}
            name="colore"
            type="color"
            defaultValue={colore ?? "#2e6f99"}
          />
        </>
      )}
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <div className={styles.azioniCompatto}>
        <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
          Salva
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setInModifica(false)}
          className={styles.bottoneCompatto}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}

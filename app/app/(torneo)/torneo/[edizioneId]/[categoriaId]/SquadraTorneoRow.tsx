"use client";

import { useState, useActionState } from "react";
import { aggiornaSquadraTorneoAction, cancellaSquadraTorneoAction } from "../../actions";
import { GIRONI_TORNEO, ETICHETTA_GIRONE } from "@/lib/girone-torneo";
import { IconaModifica, IconaCancella } from "@/app/icone-azione-riga";
import type { GironeTorneo } from "@prisma/client";
import styles from "../../torneo.module.css";

type Squadra = {
  id: string;
  nome: string;
  girone: GironeTorneo;
  referente: string | null;
  contatto: string | null;
  categoriaTorneoId: string;
};

// Story 20.2 (Epic 20, Torneo Memorial): mirror di CategoriaTorneoRow.tsx
// (app/app/(torneo)/torneo) - riga di tabella con toggle sola-lettura/
// modifica inline, useActionState per update/delete, azionePending
// condiviso, ricollasso automatico alla vista dopo un salvataggio riuscito
// ("adjust state during render", non un useEffect con setState). Stessi due
// flag di visibilita' errore dedicati di CategoriaTorneoRow (correzione
// gia' fatta in 20.1, non da reintrodurre come bug qui).
//
// Review fix (Blind Hunter, Story 20.2): colocato con la pagina che lo
// consuma (torneo/[edizioneId]/[categoriaId]/), non piu' in
// torneo/[edizioneId]/ (dove sarebbe stato confuso con page.tsx, l'elenco
// Categorie, una pagina diversa). Nessun prop edizioneTorneoId - le Server
// Action derivano il percorso di revalidatePath lato server (vedi
// commento in actions.ts), niente piu' campo nascosto non verificato.
export function SquadraTorneoRow({ squadra }: { squadra: Squadra }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaSquadraTorneoAction,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaSquadraTorneoAction,
    undefined
  );
  const azionePending = modificaPending || cancellaPending;

  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  const [erroreModificaVisibile, setErroreModificaVisibile] = useState(false);
  const [ultimoCancellaState, setUltimoCancellaState] = useState(cancellaState);
  const [erroreCancellaVisibile, setErroreCancellaVisibile] = useState(false);

  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
      setErroreModificaVisibile(false);
      setErroreCancellaVisibile(false);
    } else if (modificaState && "error" in modificaState) {
      setErroreModificaVisibile(true);
    }
  }

  if (cancellaState !== ultimoCancellaState) {
    setUltimoCancellaState(cancellaState);
    setErroreCancellaVisibile(Boolean(cancellaState && "error" in cancellaState));
  }

  return (
    <>
      <tr>
        <td>{squadra.nome}</td>
        <td>{ETICHETTA_GIRONE[squadra.girone]}</td>
        <td>{squadra.referente || "—"}</td>
        <td>{squadra.contatto || "—"}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => {
              setInModifica(true);
              setErroreModificaVisibile(false);
            }}
            disabled={azionePending || inModifica}
            aria-label={`Modifica ${squadra.nome}`}
            title={`Modifica ${squadra.nome}`}
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
            action={cancellaAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Cancellare la Squadra ${squadra.nome}? L'operazione non è reversibile.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={squadra.id} />
            <input type="hidden" name="categoriaTorneoId" value={squadra.categoriaTorneoId} />
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${squadra.nome}`}
              title={`Cancella ${squadra.nome}`}
            >
              <IconaCancella />
            </button>
          </form>
          {erroreCancellaVisibile && cancellaState && "error" in cancellaState && (
            <p role="alert" className={styles.errore}>
              {cancellaState.error.message}
            </p>
          )}
        </td>
      </tr>
      {inModifica && (
        <tr>
          <td colSpan={5}>
            <form action={modificaAction} className={styles.form}>
              <input type="hidden" name="id" value={squadra.id} />
              <input type="hidden" name="categoriaTorneoId" value={squadra.categoriaTorneoId} />
              <div className={styles.campiRiga}>
                <div className={styles.campo}>
                  <label htmlFor={`squadra-nome-${squadra.id}`}>Nome</label>
                  <input
                    id={`squadra-nome-${squadra.id}`}
                    name="nome"
                    type="text"
                    defaultValue={squadra.nome}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`squadra-girone-${squadra.id}`}>Girone</label>
                  <select
                    id={`squadra-girone-${squadra.id}`}
                    name="girone"
                    required
                    defaultValue={squadra.girone}
                  >
                    {GIRONI_TORNEO.map((girone) => (
                      <option key={girone.value} value={girone.value}>
                        {girone.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`squadra-referente-${squadra.id}`}>Referente</label>
                  <input
                    id={`squadra-referente-${squadra.id}`}
                    name="referente"
                    type="text"
                    defaultValue={squadra.referente ?? ""}
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`squadra-contatto-${squadra.id}`}>Contatto</label>
                  <input
                    id={`squadra-contatto-${squadra.id}`}
                    name="contatto"
                    type="text"
                    defaultValue={squadra.contatto ?? ""}
                  />
                </div>
              </div>
              {erroreModificaVisibile && modificaState && "error" in modificaState && (
                <p role="alert" className={styles.errore}>
                  {modificaState.error.message}
                </p>
              )}
              <div className={styles.campiRiga}>
                <button
                  disabled={azionePending}
                  type="submit"
                  className={styles.bottone}
                  aria-label={`Salva ${squadra.nome}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${squadra.nome}`}
                >
                  Annulla
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

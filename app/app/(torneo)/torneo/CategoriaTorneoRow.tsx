"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { aggiornaCategoriaTorneoAction, cancellaCategoriaTorneoAction } from "./actions";
import { SETTIMANE_TORNEO, ETICHETTA_SETTIMANA } from "@/lib/settimana-torneo";
import { IconaModifica, IconaCancella } from "@/app/icone-azione-riga";
import type { SettimanaTorneo } from "@prisma/client";
import styles from "./torneo.module.css";

type Categoria = {
  id: string;
  nome: string;
  settimana: SettimanaTorneo;
  numeroMassimoSquadre: number;
  edizioneTorneoId: string;
};

// Story 20.1 (Epic 20, Torneo Memorial): mirror di SlotRow.tsx
// (app/(orari-palestre)/slot) - riga di tabella con toggle sola-lettura/
// modifica inline, useActionState per update/delete, azionePending
// condiviso, ricollasso automatico alla vista dopo un salvataggio riuscito
// ("adjust state during render", non un useEffect con setState).
export function CategoriaTorneoRow({ categoria }: { categoria: Categoria }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaCategoriaTorneoAction,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaCategoriaTorneoAction,
    undefined
  );
  const azionePending = modificaPending || cancellaPending;

  // Review fix (Edge Case Hunter, Story 20.1): modificaState/cancellaState
  // (useActionState) restano invariati quando si chiude/riapre il form di
  // modifica (inModifica toggla solo la porzione di JSX renderizzata, non
  // smonta questo componente) - senza un flag di visibilita' dedicato, un
  // errore di un tentativo precedente riapparirebbe subito riaprendo
  // "Modifica", e un errore di cancellazione resterebbe visibile a
  // tempo indeterminato anche dopo una modifica riuscita sulla stessa riga.
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  const [erroreModificaVisibile, setErroreModificaVisibile] = useState(false);
  const [ultimoCancellaState, setUltimoCancellaState] = useState(cancellaState);
  const [erroreCancellaVisibile, setErroreCancellaVisibile] = useState(false);

  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
      setErroreModificaVisibile(false);
      // Un salvataggio riuscito rende irrilevante un eventuale errore di
      // cancellazione precedente sulla stessa riga.
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
        <td>
          {/* Story 20.2 (Epic 20, Torneo Memorial): link verso la pagina di
              dettaglio Categoria (gestione Squadre/gironi) - mirror del
              link "Categorie" nella riga Edizione di page.tsx. */}
          <Link
            className={styles.link}
            href={`/app/torneo/${categoria.edizioneTorneoId}/${categoria.id}`}
          >
            {categoria.nome}
          </Link>
        </td>
        <td>{ETICHETTA_SETTIMANA[categoria.settimana]}</td>
        <td>{categoria.numeroMassimoSquadre}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => {
              setInModifica(true);
              setErroreModificaVisibile(false);
            }}
            disabled={azionePending || inModifica}
            aria-label={`Modifica ${categoria.nome}`}
            title={`Modifica ${categoria.nome}`}
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
            action={cancellaAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Cancellare la Categoria ${categoria.nome}? L'operazione non è reversibile.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={categoria.id} />
            <input
              type="hidden"
              name="edizioneTorneoId"
              value={categoria.edizioneTorneoId}
            />
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${categoria.nome}`}
              title={`Cancella ${categoria.nome}`}
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
          <td colSpan={4}>
            <form action={modificaAction} className={styles.form}>
              <input type="hidden" name="id" value={categoria.id} />
              <input
                type="hidden"
                name="edizioneTorneoId"
                value={categoria.edizioneTorneoId}
              />
              <div className={styles.campiRiga}>
                <div className={styles.campo}>
                  <label htmlFor={`categoria-nome-${categoria.id}`}>Nome</label>
                  <input
                    id={`categoria-nome-${categoria.id}`}
                    name="nome"
                    type="text"
                    defaultValue={categoria.nome}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`categoria-settimana-${categoria.id}`}>Settimana</label>
                  <select
                    id={`categoria-settimana-${categoria.id}`}
                    name="settimana"
                    required
                    defaultValue={categoria.settimana}
                  >
                    {SETTIMANE_TORNEO.map((settimana) => (
                      <option key={settimana.value} value={settimana.value}>
                        {settimana.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`categoria-numero-massimo-${categoria.id}`}>
                    Numero massimo squadre
                  </label>
                  <input
                    id={`categoria-numero-massimo-${categoria.id}`}
                    name="numeroMassimoSquadre"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={2}
                    max={8}
                    defaultValue={categoria.numeroMassimoSquadre}
                    required
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
                  aria-label={`Salva ${categoria.nome}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${categoria.nome}`}
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

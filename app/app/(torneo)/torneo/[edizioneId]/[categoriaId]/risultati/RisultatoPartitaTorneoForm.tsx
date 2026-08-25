"use client";

import { useState, useActionState, useMemo } from "react";
import { salvaRisultatoPartitaTorneoAction } from "../../../actions";
import {
  terzoSetNecessario as calcolaTerzoSetNecessario,
  formattaRisultatoPartitaTorneo,
} from "@/lib/risultato-partita-torneo";
import { IconaModifica } from "@/app/icone-azione-riga";
import styles from "../../../torneo.module.css";

type Partita = {
  id: string;
  categoriaTorneoId: string;
  squadraCasa: { id: string; nome: string };
  squadraOspite: { id: string; nome: string };
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
  set3Casa: number | null;
  set3Ospite: number | null;
};

// Story 20.3 (Epic 20, Torneo Memorial): mirror dello stile toggle
// sola-lettura/modifica gia' in uso per Categoria/Squadra (CategoriaTorneoRow.tsx,
// SquadraTorneoRow.tsx) - qui pero' senza cancellazione (nessun AC la
// prevede per un incontro). Il terzo set e' abilitato solo quando le prime
// due squadre inserite si sono spartite i primi due set (1-1) - solo
// un'anteprima lato client per l'usabilita', il vero cancello resta
// risultatoValido dentro salvaRisultatoPartitaTorneoAction.
export function RisultatoPartitaTorneoForm({ partita }: { partita: Partita }) {
  const [inModifica, setInModifica] = useState(false);
  const [state, formAction, pending] = useActionState(
    salvaRisultatoPartitaTorneoAction,
    undefined
  );

  const [ultimoState, setUltimoState] = useState(state);
  const [erroreVisibile, setErroreVisibile] = useState(false);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setInModifica(false);
      setErroreVisibile(false);
    } else if (state && "error" in state) {
      setErroreVisibile(true);
    }
  }

  // Valori di default riusati sia per l'inizializzazione sia per il reset
  // su "Annulla" (review fix, Blind Hunter, Story 20.3): senza reset, un
  // valore digitato e poi annullato restava visibile riaprendo il form
  // sullo stesso incontro (nessun remount, lo stato di React persiste).
  function valoriIniziali() {
    return {
      set1Casa: partita.set1Casa?.toString() ?? "",
      set1Ospite: partita.set1Ospite?.toString() ?? "",
      set2Casa: partita.set2Casa?.toString() ?? "",
      set2Ospite: partita.set2Ospite?.toString() ?? "",
      set3Casa: partita.set3Casa?.toString() ?? "",
      set3Ospite: partita.set3Ospite?.toString() ?? "",
    };
  }

  const [{ set1Casa, set1Ospite, set2Casa, set2Ospite, set3Casa, set3Ospite }, setValori] =
    useState(valoriIniziali);

  // Review fix (Blind Hunter, Story 20.3): riusa la stessa regola pura di
  // lib/risultato-partita-torneo.ts (esportata come terzoSetNecessario)
  // invece di reimplementarla qui - un'unica fonte di verita' per "serve il
  // terzo set", mai due copie da tenere allineate manualmente.
  const terzoSetNecessario = useMemo(() => {
    const s1c = Number(set1Casa);
    const s1o = Number(set1Ospite);
    const s2c = Number(set2Casa);
    const s2o = Number(set2Ospite);
    if (
      !set1Casa ||
      !set1Ospite ||
      !set2Casa ||
      !set2Ospite ||
      Number.isNaN(s1c) ||
      Number.isNaN(s1o) ||
      Number.isNaN(s2c) ||
      Number.isNaN(s2o)
    ) {
      return false;
    }
    return calcolaTerzoSetNecessario({ casa: s1c, ospite: s1o }, { casa: s2c, ospite: s2o });
  }, [set1Casa, set1Ospite, set2Casa, set2Ospite]);

  const risultatoAttuale = formattaRisultatoPartitaTorneo(partita);
  const nomeIncontro = `${partita.squadraCasa.nome} - ${partita.squadraOspite.nome}`;

  return (
    <div>
      <p>
        <strong>{partita.squadraCasa.nome}</strong> vs{" "}
        <strong>{partita.squadraOspite.nome}</strong>
        {" — "}
        {risultatoAttuale ?? <em>Nessun risultato inserito</em>}{" "}
        <button
          type="button"
          className={styles.iconaBottone}
          onClick={() => {
            setInModifica(true);
            setErroreVisibile(false);
          }}
          disabled={pending || inModifica}
          aria-expanded={inModifica}
          aria-label={`Inserisci/modifica risultato ${nomeIncontro}`}
          title={`Inserisci/modifica risultato ${nomeIncontro}`}
        >
          <IconaModifica />
        </button>
      </p>
      {inModifica && (
        <form action={formAction} className={styles.form}>
          <input type="hidden" name="id" value={partita.id} />
          <input type="hidden" name="categoriaTorneoId" value={partita.categoriaTorneoId} />
          <div className={styles.campiRiga}>
            <div className={styles.campo}>
              <label htmlFor={`set1casa-${partita.id}`}>Set 1 - Casa</label>
              <input
                id={`set1casa-${partita.id}`}
                name="set1Casa"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={set1Casa}
                onChange={(e) => setValori((v) => ({ ...v, set1Casa: e.target.value }))}
              />
            </div>
            <div className={styles.campo}>
              <label htmlFor={`set1ospite-${partita.id}`}>Set 1 - Ospite</label>
              <input
                id={`set1ospite-${partita.id}`}
                name="set1Ospite"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={set1Ospite}
                onChange={(e) => setValori((v) => ({ ...v, set1Ospite: e.target.value }))}
              />
            </div>
            <div className={styles.campo}>
              <label htmlFor={`set2casa-${partita.id}`}>Set 2 - Casa</label>
              <input
                id={`set2casa-${partita.id}`}
                name="set2Casa"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={set2Casa}
                onChange={(e) => setValori((v) => ({ ...v, set2Casa: e.target.value }))}
              />
            </div>
            <div className={styles.campo}>
              <label htmlFor={`set2ospite-${partita.id}`}>Set 2 - Ospite</label>
              <input
                id={`set2ospite-${partita.id}`}
                name="set2Ospite"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={set2Ospite}
                onChange={(e) => setValori((v) => ({ ...v, set2Ospite: e.target.value }))}
              />
            </div>
            {/* Il terzo set e' abilitato solo se necessario (1-1 dopo i
                primi due) - disabled esclude il campo da FormData, coerente
                con la coppia tutto-o-niente validata server-side. */}
            <div className={styles.campo}>
              <label htmlFor={`set3casa-${partita.id}`}>Set 3 - Casa</label>
              <input
                id={`set3casa-${partita.id}`}
                name="set3Casa"
                type="number"
                inputMode="numeric"
                min={0}
                disabled={!terzoSetNecessario}
                required={terzoSetNecessario}
                value={terzoSetNecessario ? set3Casa : ""}
                onChange={(e) => setValori((v) => ({ ...v, set3Casa: e.target.value }))}
              />
            </div>
            <div className={styles.campo}>
              <label htmlFor={`set3ospite-${partita.id}`}>Set 3 - Ospite</label>
              <input
                id={`set3ospite-${partita.id}`}
                name="set3Ospite"
                type="number"
                inputMode="numeric"
                min={0}
                disabled={!terzoSetNecessario}
                required={terzoSetNecessario}
                value={terzoSetNecessario ? set3Ospite : ""}
                onChange={(e) => setValori((v) => ({ ...v, set3Ospite: e.target.value }))}
              />
            </div>
          </div>
          {erroreVisibile && state && "error" in state && (
            <p role="alert" className={styles.errore}>
              {state.error.message}
            </p>
          )}
          <div className={styles.campiRiga}>
            <button
              disabled={pending}
              type="submit"
              className={styles.bottone}
              aria-label={`Salva risultato ${nomeIncontro}`}
            >
              Salva risultato
            </button>
            <button
              type="button"
              disabled={pending}
              className={styles.bottoneSecondario}
              onClick={() => {
                setInModifica(false);
                // Review fix (Blind Hunter, Story 20.3): senza questo reset,
                // un valore digitato e poi annullato restava visibile
                // riaprendo il form sullo stesso incontro (nessun remount).
                setValori(valoriIniziali());
              }}
              aria-label={`Annulla la modifica del risultato ${nomeIncontro}`}
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

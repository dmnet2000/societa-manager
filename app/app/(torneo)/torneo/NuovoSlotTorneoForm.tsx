"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { creaSlotTorneoAction } from "./actions";
import { FASI_TORNEO } from "@/lib/fase-torneo";
import { TABELLONI_TORNEO } from "@/lib/tabelloni-torneo";
import styles from "./torneo.module.css";

type Palestra = { id: string; nome: string };

// Story 20.9 (Epic 20, Torneo Memorial): mirror di NuovaCategoriaTorneoForm.tsx
// - form di creazione, reset automatico dopo un salvataggio riuscito. Il
// campo Tabellone e' mostrato/abilitato solo quando la fase scelta non e'
// GIRONE (stesso principio del CHECK discriminato a livello DB, Story 20.4)
// - "fase" e' quindi tracciata in uno stato locale, non solo letta da
// FormData al submit.
export function NuovoSlotTorneoForm({
  edizioneTorneoId,
  palestre,
}: {
  edizioneTorneoId: string;
  palestre: Palestra[];
}) {
  const [state, formAction, pending] = useActionState(creaSlotTorneoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [fase, setFase] = useState("");

  // Mirror del pattern "adjust state during render" gia' in uso altrove
  // nell'epica (es. CategoriaTorneoRow.tsx) per lo stato "fase" - un
  // useEffect che chiamasse setFase() sincronamente al suo interno
  // dichiarerebbe cascading renders (react-hooks/set-state-in-effect). Il
  // reset del form nativo (formRef.current?.reset(), un side-effect
  // imperativo vero e proprio, non un aggiornamento di stato React) resta
  // invece nel suo useEffect separato sotto.
  const [ultimoState, setUltimoState] = useState(state);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setFase("");
    }
  }

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  const mostraTabellone = fase !== "" && fase !== "GIRONE";
  // Story 20.12: per la fase GIRONE il form non chiede piu' la Palestra -
  // creaSlotTorneoAction crea uno Slot per OGNI Palestra esistente in quel
  // caso (spec-20-12 Intent). Il campo torna visibile/obbligatorio per ogni
  // altra fase, comportamento invariato di Story 20.9.
  const mostraPalestra = fase !== "GIRONE";

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
      <div className={styles.campiRiga}>
        <div className={styles.campo}>
          <label htmlFor="nuovo-slot-etichetta">Etichetta</label>
          <input
            id="nuovo-slot-etichetta"
            name="etichetta"
            type="text"
            maxLength={100}
            required
          />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuovo-slot-data">Data</label>
          <input id="nuovo-slot-data" name="data" type="date" required />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nuovo-slot-ora">Ora</label>
          <input id="nuovo-slot-ora" name="ora" type="time" required />
        </div>
        {mostraPalestra && (
          <div className={styles.campo}>
            <label htmlFor="nuovo-slot-palestra">Palestra</label>
            <select id="nuovo-slot-palestra" name="palestraId" required defaultValue="">
              <option value="" disabled>
                Seleziona...
              </option>
              {palestre.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.campo}>
          <label htmlFor="nuovo-slot-fase">Fase</label>
          <select
            id="nuovo-slot-fase"
            name="fase"
            required
            value={fase}
            onChange={(e) => setFase(e.target.value)}
          >
            <option value="" disabled>
              Seleziona...
            </option>
            {FASI_TORNEO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {mostraTabellone && (
          <div className={styles.campo}>
            <label htmlFor="nuovo-slot-tabellone">Tabellone</label>
            <select id="nuovo-slot-tabellone" name="tabellone" required defaultValue="">
              <option value="" disabled>
                Seleziona...
              </option>
              {TABELLONI_TORNEO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {fase === "GIRONE" && (
        <p className={styles.riepilogo}>
          Verrà creato uno Slot per ciascuna Palestra già censita nel gestionale.
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Slot creato.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Crea Slot
      </button>
    </form>
  );
}

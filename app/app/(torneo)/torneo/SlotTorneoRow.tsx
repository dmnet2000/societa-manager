"use client";

import { useState, useActionState } from "react";
import { aggiornaSlotTorneoAction, cancellaSlotTorneoAction } from "./actions";
import { ETICHETTA_FASE } from "@/lib/fase-torneo";
import { ETICHETTA_TABELLONE } from "@/lib/tabelloni-torneo";
import { IconaModifica, IconaCancella } from "@/app/icone-azione-riga";
import { campiDellaPalestraSelezionata } from "@/lib/campi-palestra-torneo";
import type { FaseTorneo, TabelloneTorneo } from "@prisma/client";
import styles from "./torneo.module.css";

type Slot = {
  id: string;
  etichetta: string;
  data: string;
  ora: string;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  edizioneTorneoId: string;
  // Story 20.22: id scalari (non solo gli oggetti Palestra/Campo mostrati in
  // sola lettura sotto) - servono come defaultValue dei <select> del form di
  // modifica.
  palestraId: string;
  campoId: string | null;
  // Review fix (Blind Hunter): spec-20-9 Code Map dichiarava esplicitamente
  // "include: {palestra:true} per mostrare nome/indirizzo" - il tipo locale
  // qui era ristretto al solo nome, l'indirizzo veniva letto ma mai
  // mostrato in nessuna vista Admin.
  palestra: { nome: string; indirizzo: string | null };
  // Story 20.18 (Epic 20, Torneo Memorial): Campo opzionale - null per una
  // Palestra senza Campi censiti o per un vecchio Slot creato prima di
  // questa storia (spec-20-18 Boundaries "Always": ovunque un SlotTorneo con
  // Campo assegnato viene mostrato, il nome del Campo compare accanto al
  // nome della Palestra).
  campo: { nome: string } | null;
};

// Story 20.22: stesso tipo minimo di NuovoSlotTorneoForm.tsx (Palestra con i
// suoi Campi) - popola sia il <select> Palestra sia, per il ramo GIRONE, il
// <select> Campo filtrato sulla Palestra correntemente selezionata nel form.
type Palestra = { id: string; nome: string; campi: { id: string; nome: string }[] };

// Story 20.25 (Epic 20, Torneo Memorial, review fix - Verification Gap
// Reviewer): estratta come funzione pura esportata - mirror esatto dello
// stile gia' in uso per calcolaRigheSelezioneGirone
// (NuovoSlotTorneoForm.tsx), testata a se' in SlotTorneoRow.test.ts senza
// rendering/DOM. Senza questa estrazione, un domani un'inversione o una
// rottura della condizione (es. controllare slot.tabellone invece di
// slot.campoId) passerebbe inosservata: nessun test la eserciterebbe
// direttamente. Mirror esatto della guardia server-side in
// aggiornaSlotTorneoAction (app/(torneo)/torneo/actions.ts, spec-20-25
// Boundaries "Always").
export function slotNonModificabilePerCampo(slot: Pick<Slot, "fase" | "campoId">): boolean {
  return slot.fase !== "GIRONE" && Boolean(slot.campoId);
}

// Story 20.9 (Epic 20, Torneo Memorial): mirror di CategoriaTorneoRow.tsx.
// Story 20.22: la modifica inline arriva ora anche qui - stesso identico
// pattern (toggle inModifica, useActionState separati per modifica/
// cancellazione, ricollasso automatico dopo un salvataggio riuscito). fase/
// tabellone non sono MAI modificabili (spec-20-22 Boundaries "Always"): il
// form non li invia affatto, la Server Action li rilegge sempre dal
// database.
export function SlotTorneoRow({ slot, palestre }: { slot: Slot; palestre: Palestra[] }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaSlotTorneoAction,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaSlotTorneoAction,
    undefined
  );
  const azionePending = modificaPending || cancellaPending;

  // Mirror esatto di CategoriaTorneoRow.tsx (Review fix, Edge Case Hunter,
  // Story 20.1): senza questo flag di visibilita' dedicato, un errore di un
  // tentativo precedente riapparirebbe subito riaprendo "Modifica".
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  const [erroreModificaVisibile, setErroreModificaVisibile] = useState(false);
  const [ultimoCancellaState, setUltimoCancellaState] = useState(cancellaState);
  const [erroreCancellaVisibile, setErroreCancellaVisibile] = useState(false);

  // Story 20.22: Palestra correntemente selezionata nel form di modifica -
  // inizializzata alla Palestra attuale dello Slot, aggiornata al cambio del
  // <select> Palestra cosi' il <select> Campo (solo fase GIRONE) mostra
  // sempre i Campi della Palestra scelta, non di quella originale.
  const [palestraSelezionata, setPalestraSelezionata] = useState(slot.palestraId);

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

  const etichettaFase =
    slot.fase === "GIRONE"
      ? ETICHETTA_FASE.GIRONE
      : `${ETICHETTA_FASE[slot.fase]} (${slot.tabellone ? ETICHETTA_TABELLONE[slot.tabellone] : ""})`;

  // Campi disponibili per la Palestra correntemente selezionata nel form -
  // se l'Admin cambia Palestra, il Campo originale potrebbe non appartenerle
  // piu': in quel caso il <select> Campo riparte da "Nessuno" (key sotto).
  // Story 20.25 (review fix): derivazione condivisa con
  // NuovoSlotTorneoForm.tsx (lib/campi-palestra-torneo.ts), invece di due
  // copie identiche.
  const campiDisponibili = campiDellaPalestraSelezionata(palestre, palestraSelezionata);
  const campoDefaultValue =
    palestraSelezionata === slot.palestraId ? (slot.campoId ?? "") : "";

  // Story 20.25 (Epic 20, Torneo Memorial, rinegoziato dopo review): uno
  // Slot non-GIRONE con un Campo gia' assegnato (possibile solo dopo questa
  // storia, in creazione) non e' modificabile - aggiornaSlotTorneoAction
  // forza sempre campoId a null per queste fasi (Story 20.22, mai cambiato
  // qui), quindi anche solo modificare l'etichetta lo cancellerebbe
  // silenziosamente. Bloccato qui lato UI, mirror della guardia server-side
  // in actions.ts (spec-20-25 Boundaries "Always").
  const modificaBloccataDaCampo = slotNonModificabilePerCampo(slot);

  return (
    <>
      <tr>
        <td>{slot.etichetta}</td>
        <td>{slot.data}</td>
        <td>{slot.ora}</td>
        <td>
          {slot.palestra.nome}
          {slot.campo && ` - ${slot.campo.nome}`}
          {slot.palestra.indirizzo && (
            <span className={styles.indirizzoPalestra}> — {slot.palestra.indirizzo}</span>
          )}
        </td>
        <td>{etichettaFase}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => {
              setPalestraSelezionata(slot.palestraId);
              setInModifica(true);
              setErroreModificaVisibile(false);
            }}
            disabled={azionePending || inModifica || modificaBloccataDaCampo}
            aria-label={
              modificaBloccataDaCampo
                ? `${slot.etichetta} ha già un Campo assegnato e non è modificabile: se non è collegato a un incontro puoi cancellarlo e ricrearlo, altrimenti rimuovi prima l'assegnazione dello Slot dall'incontro`
                : `Modifica ${slot.etichetta}`
            }
            title={
              modificaBloccataDaCampo
                ? "Questo Slot ha già un Campo assegnato e non è modificabile: se non è collegato a un incontro puoi cancellarlo e ricrearlo, altrimenti rimuovi prima l'assegnazione dello Slot dall'incontro."
                : `Modifica ${slot.etichetta}`
            }
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
            action={cancellaAction}
            onSubmit={(e) => {
              if (!window.confirm(`Cancellare lo Slot "${slot.etichetta}"?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={slot.id} />
            <input type="hidden" name="edizioneTorneoId" value={slot.edizioneTorneoId} />
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${slot.etichetta}`}
              title={`Cancella ${slot.etichetta}`}
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
          <td colSpan={6}>
            <form action={modificaAction} className={styles.form}>
              <input type="hidden" name="id" value={slot.id} />
              <input type="hidden" name="edizioneTorneoId" value={slot.edizioneTorneoId} />
              <div className={styles.campiRiga}>
                <div className={styles.campo}>
                  <label htmlFor={`slot-etichetta-${slot.id}`}>Etichetta</label>
                  <input
                    id={`slot-etichetta-${slot.id}`}
                    name="etichetta"
                    type="text"
                    maxLength={100}
                    defaultValue={slot.etichetta}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-data-${slot.id}`}>Data</label>
                  <input
                    id={`slot-data-${slot.id}`}
                    name="data"
                    type="date"
                    defaultValue={slot.data}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-ora-${slot.id}`}>Ora</label>
                  <input
                    id={`slot-ora-${slot.id}`}
                    name="ora"
                    type="time"
                    defaultValue={slot.ora}
                    required
                  />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`slot-palestra-${slot.id}`}>Palestra</label>
                  <select
                    id={`slot-palestra-${slot.id}`}
                    name="palestraId"
                    required
                    defaultValue={slot.palestraId}
                    onChange={(e) => setPalestraSelezionata(e.target.value)}
                  >
                    {palestre.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Story 20.22 (spec-20-22 Boundaries "Always"): il Campo
                    compare solo per la fase GIRONE - mirror esatto della
                    condizione gia' usata da NuovoSlotTorneoForm.tsx. Ogni
                    altra fase non ha mai un Campo, invariato. */}
                {slot.fase === "GIRONE" && (
                  <div className={styles.campo}>
                    <label htmlFor={`slot-campo-${slot.id}`}>Campo</label>
                    <select
                      key={palestraSelezionata}
                      id={`slot-campo-${slot.id}`}
                      name="campoId"
                      defaultValue={campoDefaultValue}
                    >
                      <option value="">Nessuno</option>
                      {campiDisponibili.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  aria-label={`Salva ${slot.etichetta}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${slot.etichetta}`}
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

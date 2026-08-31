"use client";

import { useState, useActionState, useMemo } from "react";
import { salvaRisultatoPartitaTorneoAction, assegnaSlotPartitaTorneoAction } from "../../../actions";
import {
  terzoSetNecessario as calcolaTerzoSetNecessario,
  formattaRisultatoPartitaTorneo,
} from "@/lib/risultato-partita-torneo";
import { IconaModifica } from "@/app/icone-azione-riga";
import type { FaseTorneo, TabelloneTorneo } from "@prisma/client";
import styles from "../../../torneo.module.css";

// Story 20.9 (Epic 20, Torneo Memorial): dati minimi di uno SlotTorneo per
// il <select> di assegnazione e per la visualizzazione dello Slot corrente
// - stesso shape sia in slotDisponibili (prop) sia in partita.slotTorneo
// (gia' assegnato).
type SlotTorneoOpzione = {
  id: string;
  etichetta: string;
  data: string;
  ora: string;
  palestra: { nome: string };
  // Story 20.18 (Epic 20, Torneo Memorial): Campo opzionale - null per una
  // Palestra senza Campi censiti (spec-20-18 Boundaries "Always": il nome
  // del Campo compare sempre accanto al nome della Palestra, ovunque uno
  // SlotTorneo con Campo assegnato viene mostrato).
  campo: { nome: string } | null;
};

type Partita = {
  id: string;
  categoriaTorneoId: string;
  // Story 20.11: numero di gara progressivo dell'Edizione, sempre calcolato
  // server-side al momento della generazione - mai un input di questo form.
  numero: number;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  slotTorneoId: string | null;
  slotTorneo: SlotTorneoOpzione | null;
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
// Story 20.9: nuovi prop slotDisponibili/slotOccupati - il genitore
// (risultati/page.tsx, tabellone/page.tsx) filtra gia' slotDisponibili sulla
// fase/tabellone di QUESTA specifica Partita, e passa l'insieme di
// slotTorneoId gia' occupati da UN'ALTRA Partita della stessa Categoria (per
// l'avviso window.confirm prima di sovrascrivere, spec-20-9 Design Notes).
export function RisultatoPartitaTorneoForm({
  partita,
  slotDisponibili,
  slotOccupati,
}: {
  partita: Partita;
  slotDisponibili: SlotTorneoOpzione[];
  slotOccupati: Set<string>;
}) {
  const [inModifica, setInModifica] = useState(false);
  const [state, formAction, pending] = useActionState(
    salvaRisultatoPartitaTorneoAction,
    undefined
  );
  // Story 20.9: useActionState INDIPENDENTE per il form "Slot", stessa riga/
  // card, esito indipendente dal form risultato sopra (mirror del pattern
  // gia' in uso in AtletaTabellaRiga.tsx/VoceMenuPubblicoRow.tsx, piu' form/
  // useActionState sulla stessa riga).
  const [slotState, slotFormAction, slotPending] = useActionState(
    assegnaSlotPartitaTorneoAction,
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
        {/* Story 20.11: numero di gara progressivo dell'Edizione, sempre
            calcolato server-side - solo lettura, mai editabile qui. */}
        <span className={styles.numeroGara}>Gara {partita.numero}</span>{" "}
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

      {/* Story 20.9: assegnazione Slot (dove/quando si gioca) - form
          indipendente (proprio useActionState sopra), sempre visibile,
          nessun toggle "in modifica" (a differenza del risultato sopra: qui
          non c'e' una vista sola-lettura da rivelare, il <select> stesso
          mostra gia' l'assegnazione corrente). */}
      <form
        action={slotFormAction}
        className={`${styles.formCompatto} ${styles.formInline}`}
        onSubmit={(e) => {
          const formData = new FormData(e.currentTarget);
          const sceltoGrezzo = String(formData.get("slotTorneoId") ?? "");
          // Avviso solo se lo Slot scelto e' DIVERSO da quello gia'
          // assegnato a QUESTA Partita (altrimenti risottomettere lo stesso
          // valore non e' una sovrascrittura) ED e' gia' occupato da
          // un'altra Partita (spec-20-9 I/O matrix: "avviso esplicito prima
          // di confermare la sovrascrittura", mai un blocco).
          if (
            sceltoGrezzo &&
            sceltoGrezzo !== (partita.slotTorneoId ?? "") &&
            slotOccupati.has(sceltoGrezzo)
          ) {
            if (
              !window.confirm(
                "Questo Slot è già assegnato a un altro incontro. Vuoi sovrascrivere l'assegnazione?"
              )
            ) {
              e.preventDefault();
            }
          }
        }}
      >
        <input type="hidden" name="id" value={partita.id} />
        <input type="hidden" name="categoriaTorneoId" value={partita.categoriaTorneoId} />
        <label htmlFor={`slot-${partita.id}`}>Slot</label>
        <select
          // Review fix (Blind Hunter, Story 20.9 - stesso bug gia' risolto
          // in Story 9.35 per il campo Numero): defaultValue non si
          // aggiorna dopo una riassegnazione riuscita (select non
          // controllato, stessa istanza React prima/dopo revalidatePath) -
          // un'altra scheda/Admin che riassegna/rimuove lo Slot restava
          // invisibile qui finche' non si ricaricava la pagina a mano. La
          // key include ora il valore stesso: quando partita.slotTorneoId
          // cambia, React smonta/rimonta il <select>, riapplicando
          // defaultValue al dato fresco.
          key={partita.slotTorneoId ?? "nessuno"}
          id={`slot-${partita.id}`}
          name="slotTorneoId"
          defaultValue={partita.slotTorneoId ?? ""}
        >
          <option value="">Nessuno</option>
          {slotDisponibili.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etichetta} — {s.data} {s.ora} — {s.palestra.nome}
              {s.campo && ` - ${s.campo.nome}`}
              {slotOccupati.has(s.id) && s.id !== partita.slotTorneoId ? " (occupato)" : ""}
            </option>
          ))}
        </select>
        <button disabled={slotPending} type="submit" className={styles.bottoneCompatto}>
          {partita.slotTorneoId ? "Aggiorna Slot" : "Assegna Slot"}
        </button>
      </form>
      {slotState && "error" in slotState && (
        <p role="alert" className={styles.errore}>
          {slotState.error.message}
        </p>
      )}
      {slotState && "success" in slotState && (
        <p role="status" className={styles.successo}>
          Slot aggiornato.
        </p>
      )}
      {partita.slotTorneo && (
        <p className={styles.riepilogo}>
          {partita.slotTorneo.etichetta} — {partita.slotTorneo.data} {partita.slotTorneo.ora} —{" "}
          {partita.slotTorneo.palestra.nome}
          {partita.slotTorneo.campo && ` - ${partita.slotTorneo.campo.nome}`}
        </p>
      )}

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

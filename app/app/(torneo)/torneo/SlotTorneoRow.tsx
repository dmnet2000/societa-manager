"use client";

import { useState, useActionState } from "react";
import { cancellaSlotTorneoAction } from "./actions";
import { ETICHETTA_FASE } from "@/lib/fase-torneo";
import { ETICHETTA_TABELLONE } from "@/lib/tabelloni-torneo";
import { IconaCancella } from "@/app/icone-azione-riga";
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

// Story 20.9 (Epic 20, Torneo Memorial): mirror di CategoriaTorneoRow.tsx,
// ma senza modifica inline - nessun AC richiede la modifica di uno Slot
// esistente (spec-20-9 Code Map), solo visualizzazione + cancellazione.
export function SlotTorneoRow({ slot }: { slot: Slot }) {
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaSlotTorneoAction,
    undefined
  );
  const [ultimoCancellaState, setUltimoCancellaState] = useState(cancellaState);
  const [erroreCancellaVisibile, setErroreCancellaVisibile] = useState(false);

  if (cancellaState !== ultimoCancellaState) {
    setUltimoCancellaState(cancellaState);
    setErroreCancellaVisibile(Boolean(cancellaState && "error" in cancellaState));
  }

  const etichettaFase =
    slot.fase === "GIRONE"
      ? ETICHETTA_FASE.GIRONE
      : `${ETICHETTA_FASE[slot.fase]} (${slot.tabellone ? ETICHETTA_TABELLONE[slot.tabellone] : ""})`;

  return (
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
            disabled={cancellaPending}
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
  );
}

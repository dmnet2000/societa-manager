"use client";

import { useActionState, useState } from "react";
import { prenotaSlotIpoteticoAction } from "../../../actions";
import type { FaseTorneo, TabelloneTorneo } from "@prisma/client";
import styles from "../../../torneo.module.css";

// Story 20.21 (Epic 20, Torneo Memorial): mirror del <select> di
// assegnazione Slot di RisultatoPartitaTorneoForm.tsx - stesso shape minimo
// di uno SlotTorneo, qui pero' per una riga IPOTETICA del prospetto (Story
// 20.20, nessuna PartitaTorneo reale dietro), non per un incontro gia'
// generato.
type SlotTorneoOpzione = {
  id: string;
  etichetta: string;
  data: string;
  ora: string;
  palestra: { nome: string };
  campo: { nome: string } | null;
};

// Un form indipendente per riga (Semifinale 1/2, Finale vincenti/perdenti) -
// proprio useActionState, nessun toggle "in modifica" (stesso principio del
// form Slot di RisultatoPartitaTorneoForm.tsx: il <select> stesso mostra
// gia' l'eventuale prenotazione corrente). categoriaTorneoId/fase/tabellone/
// ordinale identificano insieme la riga esatta (spec-20-21 Boundaries
// "Always") - inviati come hidden field, mai scelti dall'utente.
export function PrenotaSlotIpoteticoForm({
  categoriaTorneoId,
  fase,
  tabellone,
  ordinale,
  etichettaRiga,
  slotDisponibili,
  slotPrenotatoId,
}: {
  categoriaTorneoId: string;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo;
  ordinale: number | null;
  etichettaRiga: string;
  slotDisponibili: SlotTorneoOpzione[];
  slotPrenotatoId: string | null;
}) {
  const [state, formAction, pending] = useActionState(prenotaSlotIpoteticoAction, undefined);
  // Review fix (3-layer review, Story 20.21 - Patch F): il messaggio di
  // successo deve distinguere una prenotazione/aggiornamento da una
  // RIMOZIONE (slotTorneoId scelto = "Nessuno") - catturato al submit
  // (prima che l'azione risolva), non derivabile da "state" (che porta solo
  // { success: true }, mai il valore inviato).
  const [ultimaScelta, setUltimaScelta] = useState<string>(slotPrenotatoId ?? "");

  const idBase = `prenota-${categoriaTorneoId}-${fase}-${tabellone}-${ordinale ?? "u"}`;

  return (
    <form
      action={formAction}
      className={`${styles.formCompatto} ${styles.formInline}`}
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget);
        setUltimaScelta(String(formData.get("slotTorneoId") ?? ""));
      }}
    >
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      <input type="hidden" name="fase" value={fase} />
      <input type="hidden" name="tabellone" value={tabellone} />
      {ordinale !== null && <input type="hidden" name="ordinale" value={ordinale} />}
      <label htmlFor={idBase}>Slot prenotato per &quot;{etichettaRiga}&quot;</label>
      <select
        // Mirror del review fix di RisultatoPartitaTorneoForm.tsx (Story
        // 20.9): la key include il valore corrente - una prenotazione
        // cambiata da un'altra scheda/Admin (revalidatePath) smonta/rimonta
        // il <select>, riapplicando defaultValue al dato fresco invece di
        // restare bloccato sul valore visto al primo render.
        key={slotPrenotatoId ?? "nessuno"}
        id={idBase}
        name="slotTorneoId"
        defaultValue={slotPrenotatoId ?? ""}
      >
        <option value="">Nessuno</option>
        {slotDisponibili.map((s) => (
          <option key={s.id} value={s.id}>
            {s.etichetta} — {s.data} {s.ora} — {s.palestra.nome}
            {s.campo && ` - ${s.campo.nome}`}
          </option>
        ))}
      </select>
      <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
        {slotPrenotatoId ? "Aggiorna prenotazione" : "Prenota"}
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          {ultimaScelta ? "Prenotazione aggiornata." : "Prenotazione rimossa."}
        </p>
      )}
    </form>
  );
}

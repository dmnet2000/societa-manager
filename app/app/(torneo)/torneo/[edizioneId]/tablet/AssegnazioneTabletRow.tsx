"use client";

import { useActionState } from "react";
import { assegnaTabletPartitaTorneoAction } from "../../actions";
import { nomeTablet, tabletNelMenu, type TabletOpzione } from "./tablet-menu";
import styles from "../../torneo.module.css";

// Referto elettronico, story 2.5: una riga della pagina di assegnazione dei
// tablet - stesso schema del form "Slot" di RisultatoPartitaTorneoForm.tsx
// (select non controllato con key sul valore corrente, useActionState,
// messaggio di errore/successo sotto il form).

export type GaraConTablet = {
  id: string;
  edizioneTorneoId: string;
  numero: number;
  categoria: string;
  casa: string;
  ospite: string;
  slot: string | null;
  tablet: TabletOpzione | null;
  epoca: number | null;
};

export function AssegnazioneTabletRow({
  gara,
  tablet,
}: {
  gara: GaraConTablet;
  tablet: readonly TabletOpzione[];
}) {
  const [state, formAction, pending] = useActionState(assegnaTabletPartitaTorneoAction, undefined);
  const assegnatoId = gara.tablet?.id ?? null;

  return (
    <tr>
      <td>{gara.numero}</td>
      <td>{gara.categoria}</td>
      <td>
        {gara.casa} – {gara.ospite}
      </td>
      <td>{gara.slot ?? "—"}</td>
      <td>
        <form action={formAction} className={`${styles.formCompatto} ${styles.formInline}`}>
          <input type="hidden" name="id" value={gara.id} />
          <input type="hidden" name="edizioneTorneoId" value={gara.edizioneTorneoId} />
          <label htmlFor={`tablet-${gara.id}`}>Tablet</label>
          <select
            // key sul valore corrente: dopo un salvataggio (revalidatePath)
            // il select si rimonta e mostra il dato fresco, stesso motivo
            // del select dello Slot in RisultatoPartitaTorneoForm.tsx.
            key={assegnatoId ?? "nessuno"}
            id={`tablet-${gara.id}`}
            name="utenteId"
            defaultValue={assegnatoId ?? ""}
          >
            <option value="">Nessun tablet</option>
            {tabletNelMenu(tablet, assegnatoId).map((t) => (
              <option key={t.id} value={t.id}>
                {nomeTablet(t.email)}
                {t.attivo ? "" : " (disattivato)"}
              </option>
            ))}
          </select>
          <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
            Salva
          </button>
        </form>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        {state && "success" in state && (
          <p role="status" className={styles.successo}>
            Tablet aggiornato.
          </p>
        )}
      </td>
      <td>{gara.epoca ?? "—"}</td>
    </tr>
  );
}

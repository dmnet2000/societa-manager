"use client";

import { useActionState } from "react";
import { salvaFrequenzaSincronizzazioneFipavOreAction } from "./actions";
import styles from "./impostazioni.module.css";

// Story 10.12: mirror 1:1 di EmailSegreteriaForm.tsx - ADMIN-only (la
// route-guard/visibilita' per Ruolo non impedisce a un non-Admin di vedere
// il resto della pagina, ma il submit fallirebbe con FORBIDDEN, mirror di
// come agisce salvaEmailSegreteriaAction).
export function FrequenzaSincronizzazioneFipavForm({
  frequenzaAttualeOre,
}: {
  frequenzaAttualeOre: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    salvaFrequenzaSincronizzazioneFipavOreAction,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.campo}>
        <label htmlFor="frequenza-sincronizzazione-fipav">
          Cadenza sincronizzazione FIPAV (ore)
        </label>
        <input
          id="frequenza-sincronizzazione-fipav"
          name="frequenzaSincronizzazioneFipavOre"
          type="number"
          min={1}
          max={720}
          step={1}
          defaultValue={frequenzaAttualeOre ?? ""}
          placeholder="24 (fallback se vuoto)"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Cadenza sincronizzazione FIPAV salvata.
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

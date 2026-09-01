"use client";

import { useState, useActionState } from "react";
import type { Ruolo } from "@prisma/client";
import { aggiornaPrecaricamentoRuolo, cancellaPrecaricamentoRuolo } from "./actions";
import { IconaModifica, IconaCancella } from "@/app/icone-azione-riga";
import styles from "./precaricamento-ruoli.module.css";

const ETICHETTA_RUOLO: Record<string, string> = {
  SEGRETERIA: "Segreteria",
  DIRIGENTE: "Dirigente",
};

const RUOLI = [
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
];

type Voce = {
  email: string;
  ruoli: Ruolo[];
  utenteId: string | null;
};

// Story 9.41: mirror esatto di AllenatoreRow.tsx (Story 9.30) - toggle
// sola-lettura/modifica, useActionState per aggiornaPrecaricamentoRuolo/
// cancellaPrecaricamentoRuolo, azionePending condiviso, ricollasso
// automatico dopo un salvataggio riuscito, icone condivise.
export function PrecaricamentoRuoloRow({ voce }: { voce: Voce }) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaPrecaricamentoRuolo,
    undefined
  );
  const [cancellaState, cancellaAction, cancellaPending] = useActionState(
    cancellaPrecaricamentoRuolo,
    undefined
  );
  const azionePending = modificaPending || cancellaPending;

  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
    }
  }

  const agganciata = Boolean(voce.utenteId);
  const stato = agganciata ? "Registrata" : "Precaricata";
  const etichetteRuoli = voce.ruoli.map((r) => ETICHETTA_RUOLO[r] ?? r).join(", ");

  return (
    <>
      <tr>
        <td>{voce.email}</td>
        <td>{etichetteRuoli}</td>
        <td>{stato}</td>
        <td>
          <button
            type="button"
            className={styles.iconaBottone}
            onClick={() => setInModifica(true)}
            disabled={azionePending || inModifica}
            aria-label={`Modifica ${voce.email}`}
            title={`Modifica ${voce.email}`}
          >
            <IconaModifica />
          </button>{" "}
          <form
            className={styles.formIconaInline}
            action={cancellaAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Cancellare il precaricamento di ${voce.email}? L'operazione non è reversibile.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="email" value={voce.email} />
            <button
              disabled={azionePending || inModifica}
              type="submit"
              className={`${styles.iconaBottone} ${styles.iconaBottoneDanger}`}
              aria-label={`Cancella ${voce.email}`}
              title={`Cancella ${voce.email}`}
            >
              <IconaCancella />
            </button>
          </form>
          {cancellaState && "error" in cancellaState && (
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
              <input type="hidden" name="emailOriginale" value={voce.email} />
              <fieldset className={styles.fieldset}>
                <legend>Ruolo (almeno uno)</legend>
                {RUOLI.map((ruolo) => (
                  <label key={ruolo.value} className={styles.checkboxRuolo}>
                    <input
                      type="checkbox"
                      name="ruoli"
                      value={ruolo.value}
                      defaultChecked={voce.ruoli.includes(ruolo.value as Ruolo)}
                    />
                    {ruolo.label}
                  </label>
                ))}
              </fieldset>
              {modificaState && "error" in modificaState && (
                <p role="alert" className={styles.errore}>
                  {modificaState.error.message}
                </p>
              )}
              <div className={styles.campiRiga}>
                <button
                  disabled={azionePending}
                  type="submit"
                  className={styles.bottone}
                  aria-label={`Salva ${voce.email}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={azionePending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModifica(false)}
                  aria-label={`Annulla la modifica di ${voce.email}`}
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

"use client";

import { useActionState, useState, useTransition } from "react";
import type { Ruolo } from "@prisma/client";
import {
  aggiornaRuoliUtente,
  impostaAttivoUtente,
  reimpostaPasswordFissaUtente,
} from "./actions";
import styles from "./admin.module.css";

const RUOLI = [
  { value: "ALLENATORE", label: "Allenatore" },
  { value: "ATLETA", label: "Atleta" },
  { value: "GENITORE", label: "Genitore" },
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
  { value: "ADMIN", label: "Admin" },
  { value: "SITE_MANAGER", label: "Site manager" },
];

type Utente = {
  id: string;
  email: string;
  attivo: boolean;
  ruoli: Ruolo[];
};

export function UtenteRow({ utente }: { utente: Utente }) {
  const [ruoliState, ruoliAction, ruoliPending] = useActionState(
    aggiornaRuoliUtente,
    undefined
  );
  const [attivoError, setAttivoError] = useState<string | null>(null);
  const [isTogglePending, startToggleTransition] = useTransition();
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResetPasswordPending, startResetPasswordTransition] = useTransition();

  function toggleAttivo() {
    setAttivoError(null);
    startToggleTransition(async () => {
      try {
        const result = await impostaAttivoUtente(
          undefined,
          utente.id,
          !utente.attivo
        );
        if (result && "error" in result) {
          setAttivoError(result.error.message);
        }
      } catch {
        setAttivoError("Impossibile aggiornare lo stato dell'utente. Riprova.");
      }
    });
  }

  // Story 9.11 (Parte B): sovrascrive silenziosamente la password attuale
  // dell'Utente senza notifica automatica - la conferma (stesso pattern
  // window.confirm() di AllenatoreRow.tsx, Story 9.9) e' l'unico argine
  // contro un click accidentale.
  function reimpostaPassword() {
    if (
      !window.confirm(
        `Reimpostare la password di ${utente.email} al valore fisso concordato? L'Utente dovrà poi cambiarla da "Modifica password".`
      )
    ) {
      return;
    }
    setResetPasswordError(null);
    startResetPasswordTransition(async () => {
      try {
        const result = await reimpostaPasswordFissaUtente(undefined, utente.id);
        if (result && "error" in result) {
          setResetPasswordError(result.error.message);
        }
      } catch {
        setResetPasswordError("Impossibile reimpostare la password. Riprova.");
      }
    });
  }

  return (
    <tr>
      <td>{utente.email}</td>
      <td>
        <form action={ruoliAction} className={styles.formCompatto}>
          <input type="hidden" name="utenteId" value={utente.id} />
          {RUOLI.map((ruolo) => (
            <label key={ruolo.value} className={styles.checkboxRuolo}>
              <input
                type="checkbox"
                name="ruoli"
                value={ruolo.value}
                defaultChecked={utente.ruoli.includes(ruolo.value as Ruolo)}
              />
              {ruolo.label}
            </label>
          ))}
          {ruoliState && "error" in ruoliState && (
            <p role="alert" className={styles.errore}>
              {ruoliState.error.message}
            </p>
          )}
          <button
            disabled={ruoliPending}
            type="submit"
            className={styles.bottoneCompatto}
          >
            Salva Ruoli
          </button>
        </form>
      </td>
      <td>{utente.attivo ? "Attivo" : "Disattivato"}</td>
      <td>
        <button
          disabled={isTogglePending}
          onClick={toggleAttivo}
          type="button"
          className={
            utente.attivo ? styles.bottoneSecondario : styles.bottoneCompatto
          }
        >
          {utente.attivo ? "Disattiva" : "Riattiva"}
        </button>
        {attivoError && (
          <p role="alert" className={styles.errore}>
            {attivoError}
          </p>
        )}
      </td>
      <td>
        <button
          disabled={isResetPasswordPending}
          onClick={reimpostaPassword}
          type="button"
          className={styles.bottoneSecondario}
          aria-label={`Reimposta password di ${utente.email}`}
        >
          Reimposta password
        </button>
        {resetPasswordError && (
          <p role="alert" className={styles.errore}>
            {resetPasswordError}
          </p>
        )}
      </td>
    </tr>
  );
}

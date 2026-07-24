"use client";

import { useActionState } from "react";
import { confermaWizardNuovaStagione } from "./actions";
import styles from "./wizard-nuova-stagione.module.css";

// AC #1/#2: nessuna checkbox/campo editabile (decisione presa in fase di
// creazione della storia) - un unico pulsante "Conferma" che copia tutto
// cio' che l'anteprima mostra. Le correzioni si fanno dopo con /gruppi.
// Nessuno stato "success" (review fix): l'azione, se riesce, fa un redirect
// verso /gruppi - un banner di successo su questa stessa pagina non
// sarebbe mai stato visibile in pratica (Next.js ri-renderizza subito la
// rotta corrente nel ramo di blocco dell'AC #3 non appena i Gruppi esistono).
export function ConfermaWizardForm() {
  const [state, formAction, pending] = useActionState(
    confermaWizardNuovaStagione,
    undefined
  );

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending} type="submit" className={styles.bottone}>
        Conferma
      </button>
    </form>
  );
}

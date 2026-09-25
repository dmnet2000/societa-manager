"use client";

import { useActionState } from "react";
import { ripristinaAtleta } from "./actions";
import styles from "./conferma-iscrizioni.module.css";

// Story 9.43 (AC #7): conferma esplicita (window.confirm, stesso pattern di
// EliminaCampionatoForm.tsx) - un solo passaggio, a differenza di
// RimuoviAtletaForm (che richiede anche la scelta obbligatoria di un
// motivo). Nessun ripristino automatico dell'Iscrizione: l'Atleta torna
// "non iscritta", da riconfermare per la stagione.
export function RipristinaAtletaForm({
  atletaId,
  nome,
}: {
  atletaId: string;
  nome: string;
}) {
  const [state, formAction, isPending] = useActionState(
    ripristinaAtleta,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (
          !window.confirm(
            `Ripristinare ${nome}? Tornerà negli elenchi operativi come non iscritta per la stagione corrente, mantenendo tutto lo storico.`
          )
        ) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="atletaId" value={atletaId} />
      <button
        type="submit"
        disabled={isPending}
        className={styles.bottoneSecondario}
        aria-label={`Ripristina ${nome}`}
      >
        Ripristina
      </button>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </form>
  );
}

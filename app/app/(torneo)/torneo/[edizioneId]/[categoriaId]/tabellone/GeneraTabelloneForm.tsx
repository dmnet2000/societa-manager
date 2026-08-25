"use client";

import { useActionState } from "react";
import { generaTabelloneAction } from "../../../actions";
import styles from "../../../torneo.module.css";

// Story 20.4 (Epic 20, Torneo Memorial): mirror di GeneraCalendarioGironiForm.tsx
// (Story 20.3, risultati/) - form di una singola azione (nessun campo
// utente, solo la Categoria come hidden field), errore mostrato con
// role="alert". Nessuna conferma window.confirm: stesso motivo di
// GeneraCalendarioGironiForm, generare il tabellone e' un'azione additiva,
// non distruttiva (spec-20-4 Boundaries: rifiutata esplicitamente se gia'
// generato, mai un secondo tentativo silenzioso).
// Review fix (Blind Hunter, Story 20.4): "pronto" (calcolato dalla pagina
// dallo stesso identico stato che genererebbe comunque il rifiuto
// server-side) disabilita il bottone invece di far scoprire il rifiuto solo
// dopo un tentativo - il vero cancello resta comunque generaTabelloneAction,
// questo e' solo un aiuto visivo, mai un controllo di sicurezza.
export function GeneraTabelloneForm({
  categoriaTorneoId,
  pronto,
}: {
  categoriaTorneoId: string;
  pronto: boolean;
}) {
  const [state, formAction, pending] = useActionState(generaTabelloneAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      <button disabled={pending || !pronto} type="submit" className={styles.bottone}>
        Genera tabellone
      </button>
    </form>
  );
}

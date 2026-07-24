"use client";

import { useState, useTransition } from "react";
import { confermaIscrizione, escludiIscrizione } from "./actions";
import type { AtletaElenco } from "@/lib/db-rls/atleta";
import styles from "./conferma-iscrizioni.module.css";

type Stato =
  | { iscritta: true; iscrizioneId: string | null }
  | { iscritta: false };

export function IscrizioneRow({
  atleta,
  iscrizioneId,
  puoConfermare,
}: {
  atleta: AtletaElenco;
  iscrizioneId: string | null;
  puoConfermare: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [stato, setStato] = useState<Stato>(
    iscrizioneId ? { iscritta: true, iscrizioneId } : { iscritta: false }
  );
  const [isPending, startTransition] = useTransition();

  function conferma() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await confermaIscrizione(undefined, atleta.id);
        if (result && "error" in result) {
          setError(result.error.message);
          return;
        }
        // confermaIscrizione non restituisce l'id della riga creata - il
        // bottone "Escludi" compare solo dopo un ricaricamento della pagina
        // (revalidatePath aggiorna i dati, non l'istanza gia' montata di
        // questo componente). Limite noto, documentato nelle Dev Notes.
        setStato({ iscritta: true, iscrizioneId: null });
      } catch {
        setError("Impossibile confermare l'iscrizione. Riprova.");
      }
    });
  }

  function escludi(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await escludiIscrizione(undefined, id);
        if (result && "error" in result) {
          setError(result.error.message);
          return;
        }
        setStato({ iscritta: false });
      } catch {
        setError("Impossibile escludere l'iscrizione. Riprova.");
      }
    });
  }

  const iscrizioneIdCorrente = stato.iscritta ? stato.iscrizioneId : null;

  return (
    <tr>
      <td>{atleta.nome}</td>
      <td>{atleta.codiceFiscale}</td>
      <td>
        <div className={styles.stato}>
          {stato.iscritta ? (
            <>
              Iscritta
              {iscrizioneIdCorrente && (
                <button
                  disabled={isPending}
                  onClick={() => escludi(iscrizioneIdCorrente)}
                  type="button"
                  className={styles.bottoneSecondario}
                >
                  Escludi
                </button>
              )}
            </>
          ) : puoConfermare ? (
            <button
              disabled={isPending}
              onClick={conferma}
              type="button"
              className={styles.bottone}
            >
              Conferma
            </button>
          ) : (
            // Review fix: la route ammette anche Admin/Dirigente (Story 1.8,
            // per l'esclusione), ma confermaIscrizione resta riservata alla
            // sola Segreteria (FR-17) - niente bottone che fallirebbe sempre.
            "Non iscritta"
          )}
        </div>
        {error && (
          <p role="alert" className={styles.errore}>
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}

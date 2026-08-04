"use client";

import { useState, useTransition } from "react";
import { confermaTesseramento } from "./actions";
import type { AtletaElenco } from "@/lib/db-rls/atleta";
import styles from "./conferma-tesseramenti.module.css";

export function TesseramentoRow({
  atleta,
  iscrizioneAttiva,
  tesseramentoConfermato,
}: {
  atleta: AtletaElenco;
  iscrizioneAttiva: boolean;
  tesseramentoConfermato: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confermato, setConfermato] = useState(tesseramentoConfermato);
  const [isPending, startTransition] = useTransition();

  function conferma() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await confermaTesseramento(undefined, atleta.id);
        if (result && "error" in result) {
          setError(result.error.message);
          return;
        }
        setConfermato(true);
      } catch {
        setError("Impossibile confermare il Tesseramento. Riprova.");
      }
    });
  }

  return (
    <tr>
      <td>{atleta.nome}</td>
      <td>{atleta.codiceFiscale}</td>
      <td className={styles.statoIscrizione}>
        {iscrizioneAttiva ? "Iscritta" : "Non iscritta"}
      </td>
      <td>
        <div className={styles.stato}>
          {confermato && iscrizioneAttiva ? (
            "Confermato"
          ) : confermato ? (
            // Review fix (Blind Hunter): senza questo ramo, un'Atleta con
            // Tesseramento gia' confermato la cui Iscrizione viene esclusa in
            // un momento successivo (/conferma-iscrizioni, Story 1.8)
            // mostrerebbe "Confermato" accanto a "Non iscritta" sulla stessa
            // riga di questa pagina - una contraddizione visibile che
            // vanificherebbe lo scopo dichiarato della storia. La riga
            // Tesseramento nel DB non viene toccata (nessuna esclusione
            // automatica a cascata, fuori scope), solo la sua
            // rappresentazione qui viene resa coerente con lo stato attuale
            // dell'Iscrizione.
            "Confermato (Iscrizione non più attiva)"
          ) : iscrizioneAttiva ? (
            <button
              disabled={isPending}
              onClick={conferma}
              type="button"
              className={styles.bottone}
            >
              Conferma
            </button>
          ) : (
            // AC #3: il vincolo va reso leggibile in UI, non solo restituito
            // come errore di validazione al submit - qui l'Atleta non ha
            // nemmeno un bottone da premere.
            "Iscrizione da confermare"
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

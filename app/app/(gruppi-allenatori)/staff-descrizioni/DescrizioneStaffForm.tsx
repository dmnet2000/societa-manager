"use client";

import { useActionState, useState } from "react";
import type { KeyboardEvent } from "react";
import { aggiornaDescrizioneStaffAction } from "./actions";
import styles from "./staff-descrizioni.module.css";

// Story 19.12 (Epic 19, Ruolo Site Manager): prima volta in questo progetto
// di un form "a chip" - i ruoli aggiuntivi vengono aggiunti/rimossi in uno
// stato locale (nessuna Server Action separata per aggiungi/rimuovi
// singolo), poi l'intero array viene serializzato in JSON in un campo
// hidden e inviato insieme alla descrizione con un solo submit. Un componente
// per riga Allenatore (mirror di FotoSquadraForm.tsx/VoceMenuPubblicoRow.tsx):
// nessun reset dopo un salvataggio riuscito, e' un form di modifica (non di
// creazione) che resta sulla stessa pagina, stesso principio di
// VoceMenuPubblicoRow.
export function DescrizioneStaffForm({
  allenatoreId,
  allenatoreNome,
  descrizioneIniziale,
  ruoliAggiuntiviIniziali,
}: {
  allenatoreId: string;
  allenatoreNome: string;
  descrizioneIniziale: string | null;
  ruoliAggiuntiviIniziali: string[];
}) {
  const [state, formAction, pending] = useActionState(
    aggiornaDescrizioneStaffAction,
    undefined
  );

  const [ruoli, setRuoli] = useState<string[]>(ruoliAggiuntiviIniziali);
  const [nuovoRuolo, setNuovoRuolo] = useState("");
  // I/O & Edge-Case Matrix (spec): "Etichetta ruolo aggiuntivo vuota/solo
  // spazi" -> rifiutata, non aggiunta all'array - questo e' il primo cancello
  // (lato client, per un feedback immediato), la Server Action valida di
  // nuovo lo stesso identico caso (il vero cancello, vedi actions.ts).
  const [erroreAggiunta, setErroreAggiunta] = useState<string | null>(null);

  function aggiungiRuolo() {
    const pulito = nuovoRuolo.trim();
    if (!pulito) {
      setErroreAggiunta("Il ruolo aggiuntivo non può essere vuoto.");
      return;
    }
    if (pulito.length > 40) {
      setErroreAggiunta("Il ruolo aggiuntivo supera i 40 caratteri.");
      return;
    }
    setRuoli((precedenti) => [...precedenti, pulito]);
    setNuovoRuolo("");
    setErroreAggiunta(null);
  }

  function rimuoviRuolo(indice: number) {
    setRuoli((precedenti) => precedenti.filter((_, i) => i !== indice));
  }

  // Invio del form al tasto Invio nel campo "nuovo ruolo": senza questo,
  // Invio sottometterebbe l'intero form (descrizione + array) invece di
  // limitarsi ad aggiungere l'etichetta allo stato locale, un comportamento
  // sorprendente per chi si aspetta di poter aggiungere piu' etichette prima
  // di salvare.
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      aggiungiRuolo();
    }
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="allenatoreId" value={allenatoreId} />
      {/* Array serializzato in JSON in un campo hidden - mirror del pattern
          "campo hidden aggiornato da JS" gia' in uso in
          PaginaPubblicaEditor.tsx per contenutoHtml. Qui il campo e'
          controllato direttamente da React (nessun ref/onUpdate imperativo
          necessario, a differenza di Tiptap): "readOnly" evita il warning
          React su un campo "value" senza "onChange", il valore reale
          continua a riflettere fedelmente lo stato "ruoli" ad ogni render. */}
      <input
        type="hidden"
        name="ruoliAggiuntivi"
        value={JSON.stringify(ruoli)}
        readOnly
      />

      <div className={styles.campo}>
        <label htmlFor={`descrizione-${allenatoreId}`}>Descrizione</label>
        <textarea
          id={`descrizione-${allenatoreId}`}
          name="descrizione"
          defaultValue={descrizioneIniziale ?? ""}
        />
      </div>

      <div className={styles.campo}>
        <span>Ruoli aggiuntivi</span>
        {ruoli.length > 0 && (
          <ul className={styles.listaChip}>
            {ruoli.map((ruolo, indice) => (
              <li key={`${ruolo}-${indice}`} className={styles.chip}>
                {ruolo}
                <button
                  type="button"
                  className={styles.bottoneRimuoviChip}
                  onClick={() => rimuoviRuolo(indice)}
                  aria-label={`Rimuovi il ruolo aggiuntivo "${ruolo}" da ${allenatoreNome}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.aggiungiRuolo}>
          <input
            type="text"
            value={nuovoRuolo}
            onChange={(e) => {
              setNuovoRuolo(e.target.value);
              if (erroreAggiunta) setErroreAggiunta(null);
            }}
            onKeyDown={handleKeyDown}
            maxLength={40}
            placeholder="es. Team Manager"
            aria-label={`Nuovo ruolo aggiuntivo per ${allenatoreNome}`}
          />
          <button type="button" className={styles.bottoneCompatto} onClick={aggiungiRuolo}>
            Aggiungi
          </button>
        </div>
        {erroreAggiunta && (
          <p role="alert" className={styles.errore}>
            {erroreAggiunta}
          </p>
        )}
      </div>

      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Dati aggiornati.
        </p>
      )}

      <button disabled={pending} type="submit" className={styles.bottone}>
        Salva
      </button>
    </form>
  );
}

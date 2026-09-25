"use client";

import { useActionState, useId, useState } from "react";
import type { MotivoRimozioneAtleta } from "@/lib/db-rls/atleta";
import { rimuoviAtleta } from "./actions";
import styles from "./conferma-iscrizioni.module.css";

// Story 9.43 (review fix): Record, non un array letterale - un futuro terzo
// valore aggiunto a MotivoRimozioneAtleta (lib/db-rls/atleta.ts, unica fonte
// di verità dei VALORI validi) farebbe fallire la build qui finché non gli
// si assegna un'etichetta, invece di lasciare questo elenco silenziosamente
// disallineato.
const ETICHETTE_MOTIVO: Record<MotivoRimozioneAtleta, string> = {
  NON_PIU_IN_SOCIETA: "Non più in società",
  TRASFERITA: "Passata ad altra società",
};

// Esportata (non solo locale): riusata da IscrizioniElenco.tsx per mostrare
// l'etichetta del motivo nella sezione "Atlete rimosse" - un'unica fonte
// per la corrispondenza valore-etichetta, mai una seconda mappa duplicata.
export const MOTIVI = (
  Object.keys(ETICHETTE_MOTIVO) as MotivoRimozioneAtleta[]
).map((value) => ({ value, label: ETICHETTE_MOTIVO[value] }));

// Story 9.43 (AC #1): "Rimuovi dalla società" - conferma esplicita a DUE
// passaggi, mai un solo click. Passaggio 1: il bottone apre un pannello
// inline con motivo obbligatorio + nota facoltativa (aperto=true) - nessuna
// scrittura ancora avvenuta. Passaggio 2: window.confirm() al submit,
// estensione del pattern di EliminaCampionatoForm.tsx (Story 10.6) - qui
// serve un motivo obbligatorio, che window.confirm nativo non può
// raccogliere da solo (da qui il pannello del passaggio 1, non riuso 1:1).
export function RimuoviAtletaForm({
  atletaId,
  nome,
}: {
  atletaId: string;
  nome: string;
}) {
  const [aperto, setAperto] = useState(false);
  // Story 9.43 (review fix): incrementato ad ogni chiusura del pannello e
  // usato come `key` del pannello sotto - forza un remount pieno (non solo
  // del <form>, dell'intero componente, incluso il suo useActionState) alla
  // riapertura. Senza questo, lo state di un tentativo fallito in
  // precedenza (state.error) resterebbe nell'hook e ricomparirebbe subito
  // alla riapertura, prima di qualunque nuovo tentativo.
  const [istanza, setIstanza] = useState(0);

  if (!aperto) {
    return (
      <button
        type="button"
        className={styles.bottoneSecondario}
        onClick={() => setAperto(true)}
        aria-label={`Rimuovi ${nome} dalla società`}
      >
        Rimuovi dalla società
      </button>
    );
  }

  return (
    <Pannello
      key={istanza}
      atletaId={atletaId}
      nome={nome}
      onAnnulla={() => {
        setAperto(false);
        setIstanza((i) => i + 1);
      }}
    />
  );
}

function Pannello({
  atletaId,
  nome,
  onAnnulla,
}: {
  atletaId: string;
  nome: string;
  onAnnulla: () => void;
}) {
  const [state, formAction, isPending] = useActionState(rimuoviAtleta, undefined);
  const idMotivo = useId();
  const idNota = useId();

  return (
    <form
      action={formAction}
      className={styles.formRimozione}
      onSubmit={(evento) => {
        const formData = new FormData(evento.currentTarget);
        const motivoLabel = MOTIVI.find(
          (m) => m.value === formData.get("motivo")
        )?.label;
        if (
          !window.confirm(
            `Rimuovere ${nome} dalla società` +
              (motivoLabel ? ` (motivo: ${motivoLabel})` : "") +
              "? L'Atleta smetterà di comparire negli elenchi operativi, ma resta ripristinabile in qualunque momento e non perde lo storico."
          )
        ) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="atletaId" value={atletaId} />
      <p className={styles.nomeConferma}>Rimuovere {nome} dalla società?</p>
      <div className={styles.campo}>
        <label htmlFor={idMotivo}>Motivo</label>
        <select id={idMotivo} name="motivo" required defaultValue="">
          <option value="" disabled>
            Seleziona...
          </option>
          {MOTIVI.map((motivo) => (
            <option key={motivo.value} value={motivo.value}>
              {motivo.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={idNota}>Nota (facoltativa)</label>
        <input id={idNota} name="nota" type="text" maxLength={500} />
      </div>
      <div className={styles.azioniRimozione}>
        <button
          type="submit"
          disabled={isPending}
          className={styles.bottoneElimina}
        >
          Conferma rimozione
        </button>
        <button
          type="button"
          disabled={isPending}
          className={styles.bottoneSecondario}
          onClick={onAnnulla}
        >
          Annulla
        </button>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
    </form>
  );
}

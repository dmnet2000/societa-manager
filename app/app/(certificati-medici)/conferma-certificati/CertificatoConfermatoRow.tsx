"use client";

import { useState, useActionState } from "react";
import type { StatoCertificatoAggregato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import {
  aggiornaCertificatoConfermato,
  ottieniUrlCertificatoConferma,
} from "./actions";
import styles from "./conferma-certificati.module.css";

// Story 9.23: stessa mappa gia' presente in ListaConfermati.tsx fino a
// questa storia - spostata qui (non duplicata) perche' il rendering del
// badge si sposta in questo componente (Task 4).
const CLASSE_BADGE: Record<StatoCertificatoAggregato, string | null> = {
  IN_REGOLA: styles.badgeInRegola,
  IN_SCADENZA: styles.badgeInScadenza,
  SCADUTO: styles.badgeScaduto,
  SENZA_CERTIFICATO: null,
};

const ETICHETTA_BADGE: Record<StatoCertificatoAggregato, string> = {
  IN_REGOLA: "In regola",
  IN_SCADENZA: "In scadenza",
  SCADUTO: "Scaduto",
  SENZA_CERTIFICATO: "",
};

type Props = {
  atletaId: string;
  nome: string;
  dataFineValiditaFormattata: string | null;
  stato: StatoCertificatoAggregato;
  dataInizioValidita: string;
  dataFineValidita: string;
  mesiValidita: number | null | undefined;
  modulo: string | null | undefined;
  filePath: string | null;
  puoModificare: boolean;
};

// Story 9.27 (AC #1/#2): estrae il singolo <li> oggi inline in
// ListaConfermati.tsx (Story 9.25) - ogni riga confermata ha bisogno del
// proprio inModifica/useActionState indipendente, stesso motivo gia'
// stabilito per SlotRow.tsx/AllenatoreRow.tsx (Story 9.9/9.13) e per
// PartitaRow.tsx (Story 10.4, stesso principio). Due <li> sibling (vista +
// modifica) invece di uno solo: .rigaConfermata e' una riga flex compatta,
// non adatta a contenere anche l'intero form di modifica - stesso pattern
// "riga + riga di modifica separata" gia' usato da PartitaRow.tsx
// (li' due <tr>, qui due <li>).
export function CertificatoConfermatoRow({
  atletaId,
  nome,
  dataFineValiditaFormattata,
  stato,
  dataInizioValidita,
  dataFineValidita,
  mesiValidita,
  modulo,
  filePath,
  puoModificare,
}: Props) {
  const [inModifica, setInModifica] = useState(false);
  const [modificaState, modificaAction, modificaPending] = useActionState(
    aggiornaCertificatoConfermato,
    undefined
  );

  // Ricollassa automaticamente alla vista dopo un salvataggio riuscito.
  // Aggiustamento di stato durante il render invece di un useEffect con
  // setState sincrono al suo interno - quest'ultimo violerebbe la regola
  // ESLint react-hooks/set-state-in-effect (stessa lezione gia' applicata
  // in PartitaRow.tsx, Story 10.4, stesso periodo di sviluppo).
  const [ultimoModificaState, setUltimoModificaState] = useState(modificaState);
  // Review fix (code review Story 9.27): il componente non viene mai
  // smontato quando si preme "Annulla" (solo il <li> di modifica sparisce
  // dal render) - senza questo flag, un errore di validazione rimaneva
  // visibile anche dopo Annulla + una nuova apertura di "Modifica", prima
  // di qualunque nuovo invio (useActionState non si resetta da solo).
  const [erroreVisibile, setErroreVisibile] = useState(false);
  if (modificaState !== ultimoModificaState) {
    setUltimoModificaState(modificaState);
    if (modificaState && "success" in modificaState) {
      setInModifica(false);
      setErroreVisibile(false);
    } else if (modificaState && "error" in modificaState) {
      setErroreVisibile(true);
    }
  }

  const classeBadge = CLASSE_BADGE[stato];

  return (
    <>
      <li className={styles.rigaConfermata}>
        <span className={styles.nomeConData}>
          {nome}
          {dataFineValiditaFormattata
            ? ` — valido fino al ${dataFineValiditaFormattata}`
            : null}
        </span>
        {classeBadge && (
          <span className={classeBadge}>{ETICHETTA_BADGE[stato]}</span>
        )}
        {puoModificare && (
          <button
            type="button"
            className={styles.bottoneVisualizza}
            onClick={() => {
              setInModifica(true);
              setErroreVisibile(false);
            }}
            disabled={inModifica}
            aria-label={`Modifica il Certificato di ${nome}`}
          >
            Modifica
          </button>
        )}
      </li>
      {puoModificare && inModifica && (
        <li className={styles.card}>
          {filePath && (
            <form action={ottieniUrlCertificatoConferma.bind(null, filePath)}>
              <button type="submit" className={styles.bottoneVisualizza}>
                Visualizza certificato caricato
              </button>
            </form>
          )}
          <form action={modificaAction}>
            <input type="hidden" name="atletaId" value={atletaId} />
            <div className={styles.campo}>
              <label>
                Data inizio validità
                <input
                  type="date"
                  name="dataInizioValidita"
                  defaultValue={dataInizioValidita}
                />
              </label>
            </div>
            <div className={styles.campo}>
              <label>
                Data fine validità
                <input
                  type="date"
                  name="dataFineValidita"
                  defaultValue={dataFineValidita}
                  required
                />
              </label>
            </div>
            <div className={styles.campo}>
              <label>
                Mesi validità
                <input
                  type="number"
                  name="mesiValidita"
                  min="1"
                  defaultValue={mesiValidita ?? ""}
                />
              </label>
            </div>
            <div className={styles.campo}>
              <label>
                Modulo
                <input type="text" name="modulo" defaultValue={modulo ?? ""} />
              </label>
            </div>
            <div className={styles.campo}>
              <label>
                {filePath
                  ? "Sostituisci con un file scansionato (opzionale)"
                  : "Allega scansione del certificato (opzionale)"}
                <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>
            {erroreVisibile && modificaState && "error" in modificaState && (
              <p role="alert" className={styles.errore}>
                {modificaState.error.message}
              </p>
            )}
            <button disabled={modificaPending} type="submit" className={styles.bottone}>
              Salva
            </button>{" "}
            <button
              type="button"
              disabled={modificaPending}
              className={styles.bottoneVisualizza}
              onClick={() => setInModifica(false)}
            >
              Annulla
            </button>
          </form>
        </li>
      )}
    </>
  );
}

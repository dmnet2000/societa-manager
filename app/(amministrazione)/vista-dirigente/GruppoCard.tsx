"use client";

import { useState } from "react";
import styles from "./vista-dirigente.module.css";

export type GruppoCardData = {
  id: string;
  nome: string;
  categoria: string;
  slotFormattati: { id: string; testo: string }[];
  // null = Gruppo escluso dai permessi configurati per il Dirigente (Story
  // 5.2) - i conteggi non sono calcolabili (i Certificati non sono
  // leggibili), non "tutti zero".
  conteggi: {
    IN_REGOLA: number;
    IN_SCADENZA: number;
    SCADUTO: number;
    SENZA_CERTIFICATO: number;
  } | null;
  atleteScadute: string[];
  numeroAtlete: number;
};

// Story 5.1: Client Component solo per lo stato locale di espansione del
// drill-down (AC #6) - nessuna Server Action coinvolta, nessuna mutazione.
// Drill-down solo sul bucket "scaduto" (Dev Notes: nessun AC richiede
// l'elenco nominale per gli altri tre bucket).
export function GruppoCard({ gruppo }: { gruppo: GruppoCardData }) {
  const [espanso, setEspanso] = useState(false);
  const haScadute = gruppo.atleteScadute.length > 0;
  const drillDownId = `drill-down-scaduto-${gruppo.id}`;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.nomeGruppo}>{gruppo.nome}</span>
        <span className={styles.categoria}>{gruppo.categoria}</span>
      </div>

      {gruppo.slotFormattati.length > 0 ? (
        <ul className={styles.slotList}>
          {gruppo.slotFormattati.map((slot) => (
            <li key={slot.id}>{slot.testo}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.messaggioVuoto}>Nessun allenamento programmato.</p>
      )}

      {gruppo.conteggi === null ? (
        <p className={styles.messaggioVuoto}>
          Fuori dai permessi configurati — stato dei certificati non visibile.
        </p>
      ) : gruppo.numeroAtlete === 0 ? (
        <p className={styles.messaggioVuoto}>Nessuna Atleta assegnata a questo Gruppo.</p>
      ) : (
        <div className={styles.statCluster}>
          <div className={`${styles.statTile} ${styles.regola}`}>
            <span className={styles.statValore}>{gruppo.conteggi.IN_REGOLA}</span>
            <span className={styles.statLabel}>in regola</span>
          </div>
          <div className={`${styles.statTile} ${styles.scadenza}`}>
            <span className={styles.statValore}>{gruppo.conteggi.IN_SCADENZA}</span>
            <span className={styles.statLabel}>in scadenza</span>
          </div>
          <button
            type="button"
            className={`${styles.statTile} ${styles.scaduto} ${haScadute ? styles.cliccabile : ""}`}
            onClick={() => haScadute && setEspanso((v) => !v)}
            disabled={!haScadute}
            aria-expanded={haScadute ? espanso : undefined}
            aria-controls={haScadute ? drillDownId : undefined}
          >
            <span className={styles.statValore}>{gruppo.conteggi.SCADUTO}</span>
            <span className={styles.statLabel}>scaduto</span>
          </button>
          <div className={`${styles.statTile} ${styles.senzaCertificato}`}>
            <span className={styles.statValore}>{gruppo.conteggi.SENZA_CERTIFICATO}</span>
            <span className={styles.statLabel}>da verificare</span>
          </div>
        </div>
      )}

      {espanso && haScadute && (
        <div id={drillDownId} className={styles.drillDown}>
          <p className={styles.drillDownTitolo}>Certificato scaduto:</p>
          <ul className={styles.drillDownLista}>
            {gruppo.atleteScadute.map((nome, i) => (
              <li key={`${nome}-${i}`}>{nome}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

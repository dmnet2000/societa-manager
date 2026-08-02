"use client";

import { useMemo, useState } from "react";
import type { StatoCertificatoAggregato } from "@/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import { ordinaPerPrioritaStato } from "@/lib/ordina-certificati-per-stato";
import styles from "./conferma-certificati.module.css";

// Story 9.23: mappa stato -> classe/etichetta badge, spostata qui da page.tsx
// (Story 9.25) insieme al resto del rendering interattivo della sezione
// "Confermati". SENZA_CERTIFICATO non e' raggiungibile in pratica (la
// dataFineValidita e' sempre obbligatoria in confermaCertificato) ma gestito
// comunque in modo difensivo (nessun badge), coerente col tipo di ritorno di
// categorizzaStatoCertificato.
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

type RigaConfermata = {
  atletaId: string;
  nome: string;
  // Review fix (Story 9.25): stringa gia' formattata lato server (page.tsx),
  // non una data grezza - formattarla qui (Client Component, quindi
  // rieseguito anche in hydration) userebbe il fuso orario del browser
  // invece di quello del server, rischiando un mismatch di idratazione se i
  // due differiscono intorno alla mezzanotte locale.
  dataFineValiditaFormattata: string | null;
  stato: StatoCertificatoAggregato;
};

// Story 9.25: prima interazione client-side di ordinamento su una lista in
// questo progetto - categorizzaStatoCertificato/il console.warn difensivo
// restano lato server (page.tsx, Story 9.23), gia' calcolati una volta per
// riga; questo componente riceve solo il risultato pronto e riordina in
// memoria, nessuna nuova richiesta al server.
export function ListaConfermati({ righe }: { righe: RigaConfermata[] }) {
  const [ordinatoPerStato, setOrdinatoPerStato] = useState(false);

  const righeVisualizzate = useMemo(
    () => (ordinatoPerStato ? ordinaPerPrioritaStato(righe) : righe),
    [righe, ordinatoPerStato]
  );

  return (
    <>
      <div className={styles.headerConfermati}>
        <button
          type="button"
          className={styles.bottoneOrdina}
          aria-pressed={ordinatoPerStato}
          onClick={() => setOrdinatoPerStato((v) => !v)}
        >
          Stato
        </button>
      </div>
      <ul className={styles.listaConfermati}>
        {righeVisualizzate.map(({ atletaId, nome, dataFineValiditaFormattata, stato }) => {
          const classeBadge = CLASSE_BADGE[stato];
          return (
            <li key={atletaId} className={styles.rigaConfermata}>
              <span className={styles.nomeConData}>
                {nome}
                {dataFineValiditaFormattata
                  ? ` — valido fino al ${dataFineValiditaFormattata}`
                  : null}
              </span>
              {classeBadge && (
                <span className={classeBadge}>{ETICHETTA_BADGE[stato]}</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

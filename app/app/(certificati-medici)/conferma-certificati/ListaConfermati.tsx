"use client";

import { useMemo, useState } from "react";
import type { StatoCertificatoAggregato } from "@/app/app/(amministrazione)/vista-dirigente/categorizza-stato-certificato";
import { ordinaPerPrioritaStato } from "@/lib/ordina-certificati-per-stato";
import { CertificatoConfermatoRow } from "./CertificatoConfermatoRow";
import styles from "./conferma-certificati.module.css";

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
  // Story 9.27 (Task 3/4): campi grezzi necessari solo al form di modifica
  // di CertificatoConfermatoRow - ordinaPerPrioritaStato (sotto) opera solo
  // su nome/stato/dataFineValiditaFormattata, questi nuovi campi non lo
  // riguardano.
  dataInizioValidita: string;
  dataFineValidita: string;
  mesiValidita: number | null | undefined;
  modulo: string | null | undefined;
  filePath: string | null;
};

// Story 9.25: prima interazione client-side di ordinamento su una lista in
// questo progetto - categorizzaStatoCertificato/il console.warn difensivo
// restano lato server (page.tsx, Story 9.23), gia' calcolati una volta per
// riga; questo componente riceve solo il risultato pronto e riordina in
// memoria, nessuna nuova richiesta al server.
export function ListaConfermati({
  righe,
  puoModificare,
}: {
  righe: RigaConfermata[];
  puoModificare: boolean;
}) {
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
        {righeVisualizzate.map((riga) => (
          <CertificatoConfermatoRow
            key={riga.atletaId}
            {...riga}
            puoModificare={puoModificare}
          />
        ))}
      </ul>
    </>
  );
}

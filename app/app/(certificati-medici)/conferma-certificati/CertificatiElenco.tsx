"use client";

import { useState } from "react";
import { CampoRicercaAtlete, esitoRicercaAtlete } from "@/app/CampoRicercaAtlete";
import { corrispondeRicercaAtleta } from "@/lib/ricerca-atlete";
import { ConfermaCertificatoRow } from "./ConfermaCertificatoRow";
import { ListaConfermati, type RigaConfermata } from "./ListaConfermati";
import styles from "./conferma-certificati.module.css";

export type RigaDaConfermare = {
  atleta: { id: string; nome: string; codiceFiscale: string };
  filePath: string | null;
  dataInizioValidita: string;
  dataFineValidita: string;
  mesiValidita: number | null | undefined;
  modulo: string | null | undefined;
};

// Le due sezioni ("Da confermare" / "Confermati") con un'unica ricerca per
// cognome, nome e codice fiscale che filtra entrambe. Le righe non
// corrispondenti sono nascoste (attributo hidden), MAI smontate: ogni riga
// tiene uno stato locale (form di conferma/modifica aperto, errori) che
// andrebbe perso se venisse rimontata a ogni digitazione.
export function CertificatiElenco({
  daConfermare,
  confermati,
  puoModificare,
}: {
  daConfermare: RigaDaConfermare[];
  confermati: RigaConfermata[];
  puoModificare: boolean;
}) {
  const [ricerca, setRicerca] = useState("");

  const inRicerca = ricerca.trim() !== "";
  const daConfermareVisibili = daConfermare.filter((riga) =>
    corrispondeRicercaAtleta(riga.atleta, ricerca)
  ).length;
  const confermatiVisibili = confermati.filter((riga) =>
    corrispondeRicercaAtleta(riga, ricerca)
  ).length;
  const totali = daConfermare.length + confermati.length;

  // Conteggio nel titolo: totale a riposo, "visibili di totale" in ricerca.
  const conteggio = (visibili: number, totale: number) =>
    inRicerca ? `${visibili} di ${totale}` : String(totale);

  return (
    <>
      <CampoRicercaAtlete
        valore={ricerca}
        onChange={setRicerca}
        esito={
          inRicerca ? esitoRicercaAtlete(daConfermareVisibili + confermatiVisibili, totali) : null
        }
      />

      <section className={styles.sezione}>
        <h2>Da confermare ({conteggio(daConfermareVisibili, daConfermare.length)})</h2>
        {daConfermare.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessun Certificato in attesa di conferma.</p>
        ) : (
          <>
            {inRicerca && daConfermareVisibili === 0 && (
              <p className={styles.messaggioVuoto}>Nessuna Atleta trovata in questa sezione.</p>
            )}
            <ul className={styles.lista}>
              {daConfermare.map(
                ({ atleta, filePath, dataInizioValidita, dataFineValidita, mesiValidita, modulo }) => (
                  <ConfermaCertificatoRow
                    key={atleta.id}
                    atleta={atleta}
                    filePath={filePath}
                    dataInizioValidita={dataInizioValidita}
                    dataFineValidita={dataFineValidita}
                    mesiValidita={mesiValidita}
                    modulo={modulo}
                    nascosta={!corrispondeRicercaAtleta(atleta, ricerca)}
                  />
                )
              )}
            </ul>
          </>
        )}
      </section>

      <section className={styles.sezione}>
        <h2>Confermati ({conteggio(confermatiVisibili, confermati.length)})</h2>
        {confermati.length === 0 ? (
          <p className={styles.messaggioVuoto}>Nessun Certificato ancora confermato.</p>
        ) : (
          <>
            {inRicerca && confermatiVisibili === 0 && (
              <p className={styles.messaggioVuoto}>Nessuna Atleta trovata in questa sezione.</p>
            )}
            <ListaConfermati
              puoModificare={puoModificare}
              righe={confermati}
              ricerca={ricerca}
            />
          </>
        )}
      </section>
    </>
  );
}

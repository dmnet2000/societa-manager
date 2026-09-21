"use client";

import { useState } from "react";
import type { AtletaElenco } from "@/lib/db-rls/atleta";
import { CampoRicercaAtlete, esitoRicercaAtlete } from "@/app/CampoRicercaAtlete";
import { corrispondeRicercaAtleta } from "@/lib/ricerca-atlete";
import { IscrizioneRow } from "./IscrizioneRow";
import styles from "./conferma-iscrizioni.module.css";

export type RigaIscrizione = {
  atleta: AtletaElenco;
  iscrizioneId: string | null;
  gruppi: string[];
};

// Elenco Atlete con ricerca per cognome, nome e codice fiscale. Le righe non
// corrispondenti sono nascoste (attributo hidden), MAI smontate: ogni
// IscrizioneRow tiene uno stato locale (Iscritta/Non iscritta dopo una
// conferma) che andrebbe perso se la riga venisse rimontata a ogni digitazione.
export function IscrizioniElenco({
  righe,
  puoConfermare,
}: {
  righe: RigaIscrizione[];
  puoConfermare: boolean;
}) {
  const [ricerca, setRicerca] = useState("");

  const visibili = righe.filter((riga) => corrispondeRicercaAtleta(riga.atleta, ricerca)).length;
  const inRicerca = ricerca.trim() !== "";

  return (
    <>
      <CampoRicercaAtlete
        valore={ricerca}
        onChange={setRicerca}
        esito={inRicerca ? esitoRicercaAtlete(visibili, righe.length) : null}
      />
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codice Fiscale</th>
              <th>Gruppo</th>
              <th>Stato Iscrizione</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((riga) => (
              <IscrizioneRow
                key={riga.atleta.id}
                atleta={riga.atleta}
                iscrizioneId={riga.iscrizioneId}
                puoConfermare={puoConfermare}
                gruppi={riga.gruppi}
                nascosta={!corrispondeRicercaAtleta(riga.atleta, ricerca)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

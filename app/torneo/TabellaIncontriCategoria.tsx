"use client";

import { useId, useState } from "react";
import type { FaseTorneo, GironeTorneo, TabelloneTorneo } from "@prisma/client";
import { etichettaFasePartitaTorneo } from "@/lib/etichetta-fase-partita-torneo";
import { formattaRisultatoPartitaTorneo } from "@/lib/risultato-partita-torneo";
import { formattaSlotTestoBreve, type SlotPubblico } from "@/lib/formatta-slot-torneo";
import styles from "./torneo-pubblico.module.css";

type PartitaTabellare = {
  id: string;
  numero: number;
  fase: FaseTorneo;
  tabellone: TabelloneTorneo | null;
  squadraCasa: { nome: string; girone: GironeTorneo };
  squadraOspite: { nome: string };
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
  set3Casa: number | null;
  set3Ospite: number | null;
  slotTorneo: SlotPubblico | null;
};

// Story 20.19 (Epic 20, Torneo Memorial): pulsante + tabella aggiuntiva che
// affianca la griglia grafica esistente (Gironi + Semifinali/Finali) di una
// Categoria, senza mai sostituirla (AC #3) - nascosta di default (AC #4),
// mostra tutti gli incontri della Categoria (Gironi+Semifinali+Finali
// insieme) in un'unica tabella ordinata per numero di Gara (AC #1/#2), stato
// indipendente per Categoria (AC #6, un componente per istanza, nessuno
// stato condiviso). Review fix (Blind Hunter): `nomeCategoria` in prop -
// senza, ogni istanza della pagina (una per Categoria) avrebbe lo stesso
// nome accessibile "Mostra tutti gli incontri", ambiguo per chi naviga con
// uno screen reader l'elenco dei controlli della pagina.
export function TabellaIncontriCategoria({
  partite,
  nomeCategoria,
}: {
  partite: PartitaTabellare[];
  nomeCategoria: string;
}) {
  const [visibile, setVisibile] = useState(false);
  const idTabella = useId();

  // AC #5: nessuna Categoria senza alcun incontro generato mostra il
  // pulsante - "partite" e' gia' l'unione Gironi+Semifinali+Finali della
  // Categoria (elencaPartiteTorneo), un array vuoto copre entrambi i casi
  // insieme (calendario di girone mai generato E tabellone mai generato).
  if (partite.length === 0) {
    return null;
  }

  const etichettaPulsante = visibile
    ? `Nascondi tutti gli incontri di ${nomeCategoria}`
    : `Mostra tutti gli incontri di ${nomeCategoria}`;

  return (
    <section className={styles.sezioneTabellaIncontri}>
      <button
        type="button"
        className={styles.bottoneTabellaIncontri}
        onClick={() => setVisibile((v) => !v)}
        aria-expanded={visibile}
        aria-controls={idTabella}
      >
        {etichettaPulsante}
      </button>

      {visibile && (
        <div id={idTabella} className={styles.tabellaScroll}>
          <table className={styles.tabellaIncontri}>
            <caption className={styles.srOnly}>
              Tutti gli incontri di {nomeCategoria}
            </caption>
            <thead>
              <tr>
                <th scope="col">Gara</th>
                <th scope="col">Fase</th>
                <th scope="col">Squadra Casa</th>
                <th scope="col">Squadra Ospite</th>
                <th scope="col">Risultato</th>
                <th scope="col">Quando/Dove</th>
              </tr>
            </thead>
            <tbody>
              {partite.map((partita) => (
                <tr key={partita.id}>
                  <td>{partita.numero}</td>
                  <td>{etichettaFasePartitaTorneo(partita)}</td>
                  <td>{partita.squadraCasa.nome}</td>
                  <td>{partita.squadraOspite.nome}</td>
                  <td>{formattaRisultatoPartitaTorneo(partita) ?? "In programma"}</td>
                  <td>
                    {partita.slotTorneo ? formattaSlotTestoBreve(partita.slotTorneo) : "Da definire"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

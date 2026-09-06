"use client";

import { useId, useState } from "react";
import type { FaseTorneo, GironeTorneo, TabelloneTorneo } from "@prisma/client";
import { etichettaFasePartitaTorneo } from "@/lib/etichetta-fase-partita-torneo";
import { formattaRisultatoPartitaTorneo } from "@/lib/risultato-partita-torneo";
import { formattaSlotTestoBreve, type SlotPubblico } from "@/lib/formatta-slot-torneo";
import {
  ETICHETTA_RISULTATO_MANCANTE,
  ordinaIncontriPerColonna,
  prossimoOrdinamento,
  type ColonnaOrdinamentoIncontri,
  type Ordinamento,
} from "@/lib/ordina-incontri-tabella";
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

// Story 20.24 (Epic 20, Torneo Memorial): le 6 intestazioni della tabella,
// tutte ordinabili - unica fonte di verita' per etichetta visibile <->
// colonna di ordinamento, riusata sia per renderizzare il <thead> sia per
// costruire l'aria-label di ciascun bottone sotto.
const COLONNE: { id: ColonnaOrdinamentoIncontri; etichetta: string }[] = [
  { id: "numero", etichetta: "Gara" },
  { id: "fase", etichetta: "Fase" },
  { id: "squadraCasa", etichetta: "Squadra Casa" },
  { id: "squadraOspite", etichetta: "Squadra Ospite" },
  { id: "risultato", etichetta: "Risultato" },
  { id: "slot", etichetta: "Quando/Dove" },
];

// Story 20.19 (Epic 20, Torneo Memorial): pulsante + tabella aggiuntiva che
// affianca la griglia grafica esistente (Gironi + Semifinali/Finali) di una
// Categoria, senza mai sostituirla (AC #3) - nascosta di default (AC #4),
// mostra tutti gli incontri della Categoria (Gironi+Semifinali+Finali
// insieme) in un'unica tabella, stato indipendente per Categoria (AC #6, un
// componente per istanza, nessuno stato condiviso). "partite" arriva gia'
// ordinato dal chiamante (Story 20.23: per data/ora dello Slot assegnato,
// non piu' per numero di Gara come all'origine di questa storia - vedi
// app/torneo/page.tsx) - questo componente si limita a renderizzare
// l'array nell'ordine ricevuto, mai a riordinarlo da solo. Review fix
// (Blind Hunter): `nomeCategoria` in prop -
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
  // Story 20.24: nessun ordinamento attivo all'apertura - "partite" arriva
  // gia' ordinato dal chiamante (Story 20.23, data/ora Slot) e resta cosi'
  // finche' un Visitatore non clicca un'intestazione (spec-20-24 Boundaries,
  // "Stato iniziale").
  const [ordinamento, setOrdinamento] = useState<Ordinamento | null>(null);

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

  // La decisione (stessa colonna -> toggle, colonna diversa -> nuova
  // crescente) vive in prossimoOrdinamento (lib/ordina-incontri-tabella.ts,
  // funzione pura testata) - qui solo l'aggiornamento dello stato React.
  function ordinaPer(colonna: ColonnaOrdinamentoIncontri) {
    setOrdinamento((attuale) => prossimoOrdinamento(attuale, colonna));
  }

  const righe = ordinamento
    ? ordinaIncontriPerColonna(partite, ordinamento.colonna, ordinamento.direzione)
    : partite;

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
                {COLONNE.map(({ id, etichetta }) => {
                  const attiva = ordinamento?.colonna === id;
                  const direzione = attiva ? ordinamento.direzione : null;
                  const ariaSort = !attiva ? "none" : direzione === "asc" ? "ascending" : "descending";
                  const ariaLabel = !attiva
                    ? `Ordina per ${etichetta}`
                    : direzione === "asc"
                      ? `${etichetta}, ordinato crescente. Clicca per ordinare decrescente`
                      : `${etichetta}, ordinato decrescente. Clicca per ordinare crescente`;

                  return (
                    <th scope="col" key={id} aria-sort={ariaSort}>
                      <button
                        type="button"
                        className={styles.bottoneOrdinamento}
                        onClick={() => ordinaPer(id)}
                        aria-label={ariaLabel}
                      >
                        {etichetta}
                        {attiva && (
                          <span className={styles.frecciaOrdinamento} aria-hidden="true">
                            {direzione === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {righe.map((partita) => (
                <tr key={partita.id}>
                  <td>{partita.numero}</td>
                  <td>{etichettaFasePartitaTorneo(partita)}</td>
                  <td>{partita.squadraCasa.nome}</td>
                  <td>{partita.squadraOspite.nome}</td>
                  <td>{formattaRisultatoPartitaTorneo(partita) ?? ETICHETTA_RISULTATO_MANCANTE}</td>
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

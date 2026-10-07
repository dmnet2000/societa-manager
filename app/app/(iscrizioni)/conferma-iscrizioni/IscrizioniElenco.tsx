"use client";

import { useId, useMemo, useState } from "react";
import type { AtletaElenco, MotivoRimozioneAtleta } from "@/lib/db-rls/atleta";
import { CampoRicercaAtlete, esitoRicercaAtlete } from "@/app/CampoRicercaAtlete";
import { corrispondeRicercaAtleta } from "@/lib/ricerca-atlete";
import {
  ordinaRigheIscrizione,
  prossimoOrdinamentoIscrizioni,
  type ColonnaOrdinamentoIscrizioni,
  type OrdinamentoIscrizioni,
} from "@/lib/ordina-righe-iscrizione";
import { IscrizioneRow } from "./IscrizioneRow";
import { RipristinaAtletaForm } from "./RipristinaAtletaForm";
import { MOTIVI } from "./RimuoviAtletaForm";
import styles from "./conferma-iscrizioni.module.css";

export type RigaIscrizione = {
  atleta: AtletaElenco;
  iscrizioneId: string | null;
  gruppi: string[];
};

// Story 9.46: colonne ordinabili (Codice Fiscale volutamente esclusa).
const COLONNE_ORDINABILI: Record<ColonnaOrdinamentoIscrizioni, string> = {
  nome: "Nome",
  gruppo: "Gruppo",
  stato: "Stato Iscrizione",
};

// Story 9.43: etichetta del motivo di rimozione - un valore non riconosciuto
// (mai dovrebbe accadere, l'enum e' validato server-side) resta comunque
// leggibile invece di sparire silenziosamente.
function etichettaMotivo(motivo: MotivoRimozioneAtleta | null): string {
  return MOTIVI.find((m) => m.value === motivo)?.label ?? motivo ?? "—";
}

// Mirror di formattaData già in uso altrove nel progetto (es. partite/
// page.tsx) - qui su un DateTime completo (rimossaIl), non solo la data.
function formattaDataRimozione(rimossaIl: string | null): string {
  if (!rimossaIl) return "—";
  return new Date(rimossaIl).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

// Elenco Atlete con ricerca per cognome, nome e codice fiscale. Le righe non
// corrispondenti sono nascoste (attributo hidden), MAI smontate: ogni
// IscrizioneRow tiene uno stato locale (Iscritta/Non iscritta dopo una
// conferma) che andrebbe perso se la riga venisse rimontata a ogni digitazione.
export function IscrizioniElenco({
  righe,
  righeRimosse,
  puoConfermare,
}: {
  righe: RigaIscrizione[];
  // Story 9.43 (AC #7/#8): Atlete rimosse, sezione a scomparsa separata -
  // stesso trattamento "nascosta non smontata" della tabella principale
  // durante la ricerca.
  righeRimosse: AtletaElenco[];
  puoConfermare: boolean;
}) {
  const [ricerca, setRicerca] = useState("");
  const [rimosseVisibili, setRimosseVisibili] = useState(false);
  const idSezioneRimosse = useId();
  // Story 9.46: ordinamento client-side, iniziale per Nome crescente (lo
  // stesso ordine in cui la pagina carica le Atlete). Si ordina sulla prop
  // `righe`: confermaIscrizione/escludiIscrizione chiamano revalidatePath,
  // che da una Server Function aggiorna subito i dati della pagina senza
  // rimontare questo componente - la prop cambia, la riga si sposta appena
  // l'azione termina e l'ordinamento scelto resta. Le righe riordinate non
  // vengono smontate (key = id Atleta), lo stato locale di IscrizioneRow
  // resta. Un ricaricamento completo del browser riporta l'ordine per Nome.
  const [ordinamento, setOrdinamento] = useState<OrdinamentoIscrizioni>({
    colonna: "nome",
    direzione: "asc",
  });

  const righeOrdinate = useMemo(
    () => ordinaRigheIscrizione(righe, ordinamento.colonna, ordinamento.direzione),
    [righe, ordinamento]
  );

  // Mirror di TabellaIncontriCategoria.tsx (Story 20.24): aria-sort sul th,
  // aria-label con la direzione sul bottone, freccia solo decorativa.
  function intestazioneOrdinabile(colonna: ColonnaOrdinamentoIscrizioni) {
    const etichetta = COLONNE_ORDINABILI[colonna];
    const attiva = ordinamento.colonna === colonna;
    const direzione = attiva ? ordinamento.direzione : null;
    const ariaSort = !attiva ? "none" : direzione === "asc" ? "ascending" : "descending";
    const ariaLabel = !attiva
      ? `Ordina per ${etichetta}`
      : direzione === "asc"
        ? `${etichetta}, ordinato crescente. Ordina decrescente`
        : `${etichetta}, ordinato decrescente. Ordina crescente`;

    return (
      <th scope="col" aria-sort={ariaSort} className={styles.thOrdinabile}>
        <button
          type="button"
          className={styles.bottoneOrdinamento}
          onClick={() =>
            setOrdinamento((attuale) => prossimoOrdinamentoIscrizioni(attuale, colonna))
          }
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
  }

  const visibili = righe.filter((riga) => corrispondeRicercaAtleta(riga.atleta, ricerca)).length;
  const rimosseVisibiliConteggio = righeRimosse.filter((atleta) =>
    corrispondeRicercaAtleta(atleta, ricerca)
  ).length;
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
              {intestazioneOrdinabile("nome")}
              <th scope="col">Codice Fiscale</th>
              {intestazioneOrdinabile("gruppo")}
              {intestazioneOrdinabile("stato")}
            </tr>
          </thead>
          <tbody>
            {righeOrdinate.map((riga) => (
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

      {righeRimosse.length > 0 && (
        <section className={styles.sezioneRimosse}>
          <h2>Atlete rimosse</h2>
          <button
            type="button"
            className={styles.bottoneRimosse}
            onClick={() => setRimosseVisibili((v) => !v)}
            aria-expanded={rimosseVisibili}
            aria-controls={idSezioneRimosse}
          >
            {rimosseVisibili
              ? `Nascondi Atlete rimosse (${righeRimosse.length})`
              : `Mostra Atlete rimosse (${righeRimosse.length})`}
          </button>

          {rimosseVisibili && (
            <div id={idSezioneRimosse} className={styles.scrollWrapper}>
              {inRicerca && (
                <p role="status" className={styles.motivoRimozione}>
                  {esitoRicercaAtlete(rimosseVisibiliConteggio, righeRimosse.length)}
                </p>
              )}
              <table className={styles.tabella}>
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Codice Fiscale</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Data</th>
                    <th scope="col">Nota</th>
                    <th scope="col">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {righeRimosse.map((atleta) => (
                    <tr key={atleta.id} hidden={!corrispondeRicercaAtleta(atleta, ricerca)}>
                      <td>{atleta.nome}</td>
                      <td>{atleta.codiceFiscale}</td>
                      <td>{etichettaMotivo(atleta.motivoRimozione)}</td>
                      <td>{formattaDataRimozione(atleta.rimossaIl)}</td>
                      <td>{atleta.notaRimozione || "—"}</td>
                      <td>
                        <RipristinaAtletaForm atletaId={atleta.id} nome={atleta.nome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

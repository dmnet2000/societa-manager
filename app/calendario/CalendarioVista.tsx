"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { testoScuroSuSfondo } from "@/lib/colore-testo-leggibile";
import {
  CHIAVE_STORAGE_NASCOSTI,
  INTESTAZIONI_SETTIMANA,
  bordiNavigazione,
  campionatiDistinti,
  etichettaGiorno,
  etichettaMese,
  filtraVisibili,
  intervalloMesi,
  leggiNascosti,
  meseAdiacente,
  meseIniziale,
  partitePerGiorno,
  settimaneDelMese,
  unisciNascostiDaSalvare,
  type CampionatoLegenda,
} from "@/lib/griglia-mensile";
import styles from "./calendario.module.css";

// Story 18.32: interruttore Elenco/Mese sulla stessa URL. L'elenco
// settimanale resta un Server Component (arriva qui come `children`,
// identico a prima) - questo componente sceglie solo cosa mostrare. La vista
// Mese lavora esclusivamente sulle Partite gia' lette dal server: nessuna
// richiesta al cambio mese, nessuna scrittura server.

export type PartitaMese = {
  id: string;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  campionato: { id: string; nome: string; colore: string | null };
};

type Vista = "elenco" | "mese";

// localStorage letto/scritto sempre in try/catch: storage assente o
// bloccato (modalita' privata, anteprime) = tutti selezionati, la selezione
// vale solo per questa visita.
function leggiStorage(): string | null {
  try {
    return window.localStorage.getItem(CHIAVE_STORAGE_NASCOSTI);
  } catch {
    return null;
  }
}

export function CalendarioVista({
  partite,
  meseOggi,
  children,
}: {
  partite: PartitaMese[];
  // Calcolato sul server (meseCorrente(), UTC): mai new Date() nel render
  // client, niente mismatch di idratazione.
  meseOggi: string;
  children: ReactNode;
}) {
  const [vista, setVista] = useState<Vista>("elenco");
  const intervallo = useMemo(() => intervalloMesi(partite.map((p) => p.data)), [partite]);
  const campionati = useMemo(() => campionatiDistinti(partite), [partite]);
  const idValidi = useMemo(() => campionati.map((c) => c.id), [campionati]);

  // Mese e Campionati NASCOSTI (non i visibili: un Campionato nuovo compare
  // selezionato di default) vivono qui, cosi' sopravvivono al passaggio
  // Mese -> Elenco -> Mese. Restano null finche' l'utente non apre la vista
  // Mese per la prima volta: vengono inizializzati nel click handler, cioe'
  // solo nel browser - il render server (sempre "elenco") non tocca mai
  // localStorage, nessun rischio di idratazione, nessun useEffect di lettura
  // e nessun lampeggio iniziale con tutti i Campionati visibili.
  const [mese, setMese] = useState<string | null>(null);
  const [nascosti, setNascosti] = useState<string[] | null>(null);

  function apriMese() {
    if (mese === null) {
      setMese(intervallo ? meseIniziale(meseOggi, intervallo.min, intervallo.max) : meseOggi);
    }
    if (nascosti === null) {
      setNascosti(leggiNascosti(leggiStorage(), idValidi));
    }
    setVista("mese");
  }

  // Scrittura della preferenza (nessun setState qui): conserva anche gli id
  // gia' salvati di Campionati che non appartengono a questa stagione.
  useEffect(() => {
    if (nascosti === null) return;
    try {
      window.localStorage.setItem(
        CHIAVE_STORAGE_NASCOSTI,
        JSON.stringify(unisciNascostiDaSalvare(leggiStorage(), nascosti, idValidi))
      );
    } catch {
      // storage non disponibile: la selezione vale solo per questa visita
    }
  }, [nascosti, idValidi]);

  // setState funzionale: due toggle rapidi non si perdono; nascondere un id
  // gia' nascosto non crea duplicati.
  function cambiaVisibilita(id: string, visibile: boolean) {
    setNascosti((prec) => {
      const correnti = prec ?? [];
      if (visibile) return correnti.filter((n) => n !== id);
      return correnti.includes(id) ? correnti : [...correnti, id];
    });
  }

  return (
    <>
      <div className={styles.interruttore} role="group" aria-label="Vista del calendario">
        <button
          type="button"
          className={styles.bottoneVista}
          aria-pressed={vista === "elenco"}
          onClick={() => setVista("elenco")}
        >
          Elenco
        </button>
        <button
          type="button"
          className={styles.bottoneVista}
          aria-pressed={vista === "mese"}
          onClick={apriMese}
        >
          Mese
        </button>
      </div>
      {vista === "mese" && mese !== null && nascosti !== null ? (
        <GrigliaMese
          partite={partite}
          campionati={campionati}
          intervallo={intervallo}
          mese={mese}
          onCambiaMese={setMese}
          nascosti={nascosti}
          onCambiaVisibilita={cambiaVisibilita}
        />
      ) : (
        children
      )}
    </>
  );
}

function GrigliaMese({
  partite,
  campionati,
  intervallo,
  mese,
  onCambiaMese,
  nascosti,
  onCambiaVisibilita,
}: {
  partite: PartitaMese[];
  campionati: CampionatoLegenda[];
  intervallo: { min: string; max: string } | null;
  mese: string;
  onCambiaMese: (mese: string) => void;
  nascosti: string[];
  onCambiaVisibilita: (id: string, visibile: boolean) => void;
}) {
  const perGiorno = useMemo(
    () => partitePerGiorno(filtraVisibili(partite, nascosti)),
    [partite, nascosti]
  );

  const settimane = useMemo(() => settimaneDelMese(mese), [mese]);
  const { primo: primoMese, ultimo: ultimoMese } = bordiNavigazione(mese, intervallo);
  const tuttiDeselezionati =
    campionati.length > 0 && campionati.every((c) => nascosti.includes(c.id));

  return (
    <div className={styles.vistaMese}>
      <div className={styles.navigazioneMese}>
        <button
          type="button"
          className={styles.frecciaMese}
          onClick={() => onCambiaMese(meseAdiacente(mese, -1))}
          disabled={primoMese}
          aria-label="Mese precedente"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <h2 className={styles.titoloMese} aria-live="polite">
          {etichettaMese(mese)}
        </h2>
        <button
          type="button"
          className={styles.frecciaMese}
          onClick={() => onCambiaMese(meseAdiacente(mese, 1))}
          disabled={ultimoMese}
          aria-label="Mese successivo"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <fieldset className={styles.legenda}>
        <legend className={styles.legendaTitolo}>Campionati</legend>
        {campionati.map((campionato) => (
          <label key={campionato.id} className={styles.voceLegenda}>
            <input
              type="checkbox"
              className={styles.checkboxLegenda}
              checked={!nascosti.includes(campionato.id)}
              onChange={(e) => onCambiaVisibilita(campionato.id, e.target.checked)}
            />
            <span
              className={styles.pallinoLegenda}
              style={campionato.colore ? { backgroundColor: campionato.colore } : undefined}
              aria-hidden="true"
            />
            {campionato.nome}
          </label>
        ))}
      </fieldset>

      {/* Con tutti i Campionati deselezionati una griglia muta sembrerebbe un
          mese senza Partite: messaggio esplicito. Le singole celle vuote
          restano invece silenziose. */}
      {tuttiDeselezionati ? (
        <p className={styles.messaggioNessunCampionato}>Nessun Campionato selezionato.</p>
      ) : (
      <div className={styles.griglia}>
        {INTESTAZIONI_SETTIMANA.map((giorno) => (
          <div key={giorno} className={styles.intestazioneGiorno} aria-hidden="true">
            {giorno}
          </div>
        ))}
        {settimane.flat().map((giorno) => {
          const partiteGiorno = giorno.delMese ? (perGiorno.get(giorno.data) ?? []) : [];
          const etichetta = etichettaGiorno(giorno.data);
          const classiCella = giorno.delMese
            ? styles.cella
            : `${styles.cella} ${styles.cellaFuoriMese}`;
          // Solo le celle con Partite sono un gruppo etichettato con la data;
          // quelle vuote restano silenziose anche per lo screen reader.
          const conPartite = partiteGiorno.length > 0;
          return (
            <div
              key={giorno.data}
              className={classiCella}
              role={conPartite ? "group" : undefined}
              aria-label={conPartite ? etichetta : undefined}
              aria-hidden={giorno.delMese ? undefined : true}
            >
              <span className={styles.numeroGiorno} aria-hidden="true">
                {Number(giorno.data.slice(8, 10))}
              </span>
              {/* Solo sotto i 900px, dove la griglia diventa una colonna di
                  giorni e il numero da solo non basta a orientarsi. */}
              <span className={styles.giornoEsteso} aria-hidden="true">
                {etichetta}
              </span>
              {partiteGiorno.length > 0 && (
                <ul
                  className={styles.eventiGiorno}
                  tabIndex={0}
                  aria-label={`Partite di ${etichetta}`}
                >
                  {partiteGiorno.map((partita) => {
                    const colore = partita.campionato.colore;
                    const classiEvento =
                      colore && testoScuroSuSfondo(colore)
                        ? `${styles.evento} ${styles.eventoTestoScuro}`
                        : styles.evento;
                    return (
                      <li
                        key={partita.id}
                        className={classiEvento}
                        style={colore ? { backgroundColor: colore } : undefined}
                        title={partita.campionato.nome}
                      >
                        <span className={styles.oraEvento}>{partita.ora}</span>{" "}
                        <span>
                          {partita.squadraCasa} - {partita.squadraOspite}
                        </span>
                        <span className={styles.soloLettoreSchermo}>
                          {` (${partita.campionato.nome})`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

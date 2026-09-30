"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { testoScuroSuSfondo } from "@/lib/colore-testo-leggibile";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
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
  righeDettaglioPartita,
  settimaneDelMese,
  unisciNascostiDaSalvare,
  type CampionatoLegenda,
  type PartitaVistaMese,
} from "@/lib/griglia-mensile";
import styles from "./calendario.module.css";

// Story 18.32: interruttore Elenco/Mese sulla stessa URL. L'elenco
// settimanale resta un Server Component (arriva qui come `children`,
// identico a prima) - questo componente sceglie solo cosa mostrare. La vista
// Mese lavora esclusivamente sulle Partite gia' lette dal server: nessuna
// richiesta al cambio mese, nessuna scrittura server.

// Campi della griglia + campi del popup di dettaglio (seguito Story 18.32),
// definiti una volta sola in lib/griglia-mensile.ts.
export type PartitaMese = PartitaVistaMese;

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

  // Seguito Story 18.32: un solo <dialog> per tutta la griglia, con la
  // Partita selezionata nello stato. Il pulsante di origine viene salvato al
  // click per ridargli il focus alla chiusura (x, Esc o clic sullo sfondo:
  // tutte passano dall'evento "close" del dialog).
  const [selezionata, setSelezionata] = useState<PartitaMese | null>(null);
  const origineRef = useRef<HTMLButtonElement | null>(null);

  function apriDettaglio(partita: PartitaMese, origine: HTMLButtonElement) {
    origineRef.current = origine;
    setSelezionata(partita);
  }

  // Fallback del ritorno del focus: se la striscia di origine non e' piu' nel
  // documento, il titolo del mese (tabIndex=-1, focusabile solo da script).
  const titoloMeseRef = useRef<HTMLHeadingElement>(null);

  function dettaglioChiuso() {
    setSelezionata(null);
    const origine = origineRef.current;
    if (origine?.isConnected) origine.focus();
    else titoloMeseRef.current?.focus();
    origineRef.current = null;
  }

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
        <h2
          ref={titoloMeseRef}
          className={styles.titoloMese}
          aria-live="polite"
          tabIndex={-1}
        >
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
                <ul className={styles.eventiGiorno} aria-label={`Partite di ${etichetta}`}>
                  {partiteGiorno.map((partita) => {
                    const colore = partita.campionato.colore;
                    const classiEvento =
                      colore && testoScuroSuSfondo(colore)
                        ? `${styles.evento} ${styles.eventoTestoScuro}`
                        : styles.evento;
                    return (
                      <li key={partita.id} className={styles.voceEvento}>
                        <button
                          type="button"
                          className={classiEvento}
                          style={colore ? { backgroundColor: colore } : undefined}
                          title={partita.campionato.nome}
                          aria-haspopup="dialog"
                          onClick={(e) => apriDettaglio(partita, e.currentTarget)}
                        >
                          <span className={styles.oraEvento}>{partita.ora}</span>{" "}
                          <span>
                            {partita.squadraCasa} - {partita.squadraOspite}
                          </span>
                          <span className={styles.soloLettoreSchermo}>
                            {` (${partita.campionato.nome})`}
                          </span>
                        </button>
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

      <DettaglioPartita partita={selezionata} onChiuso={dettaglioChiuso} />
    </div>
  );
}

// Browser senza <dialog> completo (Safari < 15.4): showModal/close possono
// mancare. Fallback sull'attributo "open" (finestra non modale ma
// visibile) e, alla chiusura, evento "close" emesso a mano cosi' il
// percorso di chiusura (stato + focus) resta uno solo. Mai un crash.
function haShowModal(dialog: HTMLDialogElement): boolean {
  return typeof dialog.showModal === "function";
}

function apriDialog(dialog: HTMLDialogElement) {
  if (haShowModal(dialog)) dialog.showModal();
  else dialog.setAttribute("open", "");
}

function chiudiDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.close === "function") {
    dialog.close();
  } else if (dialog.hasAttribute("open")) {
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new Event("close"));
  }
}

// Seguito Story 18.32: popup modale con il dettaglio della Partita. <dialog>
// nativo con showModal() (focus intrappolato, Esc e sfondo inerte gestiti
// dal browser); nessuna richiesta al click, i dati arrivano gia' dal server.
function DettaglioPartita({
  partita,
  onChiuso,
}: {
  partita: PartitaMese | null;
  onChiuso: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const chiudiRef = useRef<HTMLButtonElement>(null);
  // true solo se il pointerdown e' partito sullo sfondo (target = dialog).
  const premutoSuSfondoRef = useRef(false);
  const idBase = useId();
  const idCampionato = `${idBase}-campionato`;
  const idTitolo = `${idBase}-titolo`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // hasAttribute, non dialog.open: la proprieta' manca dove manca <dialog>.
    const aperto = dialog.hasAttribute("open");
    if (partita && !aperto) {
      apriDialog(dialog);
      // Focus iniziale esplicito sul bottone x, dentro la finestra.
      chiudiRef.current?.focus();
    } else if (!partita && aperto) {
      chiudiDialog(dialog);
    }
  }, [partita]);

  function chiudi() {
    if (dialogRef.current) chiudiDialog(dialogRef.current);
  }

  // Clic sullo sfondo: il dialog non ha padding e lo scroll sta sul corpo
  // interno (la scrollbar non e' del dialog), quindi un click con target il
  // dialog stesso cade sul backdrop. Si chiude solo se anche il pointerdown
  // e' partito li' (una selezione di testo iniziata dentro e rilasciata fuori
  // non chiude) e le coordinate sono fuori dal rettangolo del contenuto.
  function clickSuDialog(e: MouseEvent<HTMLDialogElement>) {
    const premutoSuSfondo = premutoSuSfondoRef.current;
    premutoSuSfondoRef.current = false;
    if (e.target !== e.currentTarget || !premutoSuSfondo) return;
    const rect = corpoRef.current?.getBoundingClientRect();
    const fuori =
      !rect ||
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (fuori) chiudi();
  }

  const colore = partita?.campionato.colore ?? null;
  const classiTestata =
    colore && testoScuroSuSfondo(colore)
      ? `${styles.dialogoTestata} ${styles.dialogoTestataTestoScuro}`
      : styles.dialogoTestata;
  const righe = partita ? righeDettaglioPartita(partita) : [];
  const linkNaviga = partita
    ? costruisciLinkNaviga({ indirizzo: partita.indirizzoImpianto })
    : null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialogo}
      aria-labelledby={partita ? `${idCampionato} ${idTitolo}` : undefined}
      onClose={onChiuso}
      onPointerDown={(e) => {
        premutoSuSfondoRef.current = e.target === e.currentTarget;
      }}
      onClick={clickSuDialog}
      // Esc nel fallback senza showModal (il browser non lo gestisce da se').
      onKeyDown={(e) => {
        if (e.key === "Escape" && !haShowModal(e.currentTarget)) chiudi();
      }}
    >
      {partita && (
        <div ref={corpoRef} className={styles.dialogoCorpo}>
          <div
            className={classiTestata}
            style={colore ? { backgroundColor: colore } : undefined}
          >
            <p id={idCampionato} className={styles.dialogoCampionato}>
              {partita.campionato.nome}
            </p>
            <button
              ref={chiudiRef}
              type="button"
              className={styles.dialogoChiudi}
              onClick={chiudi}
              aria-label="Chiudi"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className={styles.dialogoDettagli}>
            <h2 id={idTitolo} className={styles.dialogoTitolo}>
              {partita.squadraCasa} - {partita.squadraOspite}
            </h2>
            <dl className={styles.dialogoRighe}>
              {righe.map((riga) => (
                <div key={riga.chiave} className={styles.dialogoRiga}>
                  <dt className={styles.dialogoEtichetta}>{riga.etichetta}</dt>
                  <dd className={styles.dialogoValore}>
                    {riga.valore}
                    {riga.chiave === "indirizzo" && linkNaviga && (
                      <>
                        {" "}
                        <a
                          className={styles.dialogoNaviga}
                          href={linkNaviga}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Naviga verso ${partita.impianto?.trim() || "il luogo della partita"}`}
                        >
                          Naviga
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </dialog>
  );
}

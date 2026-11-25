"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { salvaTutoriAtletaAction } from "./actions";
import type { DatiGenitoriTutori, TutoreSalvato } from "./genitori-tutori-per-atleta";
import styles from "./gruppi.module.css";

type CampoTesto = {
  campo: keyof TutoreSalvato;
  etichetta: string;
  type: string;
  autoComplete?: string;
  maxLength?: number;
  autoCapitalize?: string;
  spellCheck?: boolean;
};

const CAMPI_TESTO: CampoTesto[] = [
  { campo: "nome", etichetta: "Cognome e Nome", type: "text", autoComplete: "off" },
  {
    campo: "codiceFiscale",
    etichetta: "Codice Fiscale",
    type: "text",
    autoComplete: "off",
    maxLength: 16,
    autoCapitalize: "characters",
    spellCheck: false,
  },
  { campo: "luogoNascita", etichetta: "Luogo di nascita (opzionale)", type: "text" },
  { campo: "dataNascita", etichetta: "Data di nascita (opzionale)", type: "date" },
  { campo: "indirizzo", etichetta: "Indirizzo di residenza (opzionale)", type: "text" },
  { campo: "cap", etichetta: "CAP (opzionale)", type: "text" },
  { campo: "localitaResidenza", etichetta: "Località di residenza (opzionale)", type: "text" },
  { campo: "provinciaResidenza", etichetta: "Provincia di residenza (opzionale)", type: "text" },
  { campo: "email", etichetta: "Email (opzionale)", type: "email" },
  { campo: "telefono", etichetta: "Telefono (opzionale)", type: "tel" },
];

// Story 27.1: secondo form accanto a "Modifica" (ModificaDatiAtletaForm.tsx),
// stesso toggle sola-lettura/modifica e stessa "adjust state during render"
// per ricollassare al successo. Montato dal chiamante solo per Atlete
// minorenni (o maggiorenni con Genitori/Tutori ancora salvati, in modalita'
// sola rimozione) e solo per ADMIN/SEGRETERIA - salvaTutoriAtletaAction
// ripete entrambi i controlli lato server.
// Invio via onSubmit + startTransition invece di <form action>: con
// <form action> React 19 resetta i campi non controllati dopo l'action, e
// su un errore di validazione l'utente perderebbe tutto quanto digitato.
export function GenitoriTutoriForm({
  atletaId,
  nome,
  dati,
  idPrefisso,
}: {
  atletaId: string;
  nome: string;
  dati: DatiGenitoriTutori;
  // Un'Atleta puo' comparire in piu' Gruppi sulla stessa pagina (Story
  // 9.21): il chiamante passa un prefisso univoco per riga (es. gruppoId)
  // per non duplicare gli id HTML label/input.
  idPrefisso: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [state, formAction, pending] = useActionState(salvaTutoriAtletaAction, undefined);
  const [ultimoState, setUltimoState] = useState(state);
  const [erroreVisibile, setErroreVisibile] = useState(false);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state && "success" in state) {
      setAperto(false);
      setErroreVisibile(false);
    } else if (state && "error" in state) {
      setErroreVisibile(true);
    }
  }

  function invia(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  if (!aperto) {
    return (
      <button
        type="button"
        className={styles.bottoneCompatto}
        onClick={() => {
          setAperto(true);
          setErroreVisibile(false);
        }}
        aria-label={`Genitori/Tutori di ${nome}`}
      >
        Genitori
      </button>
    );
  }

  const errore =
    erroreVisibile && state && "error" in state ? (
      <p role="alert" className={styles.errore}>
        {state.error.message}
      </p>
    ) : null;

  const annulla = (
    <button
      type="button"
      disabled={pending}
      className={styles.bottoneSecondario}
      onClick={() => setAperto(false)}
    >
      Annulla
    </button>
  );

  // Atleta maggiorenne con Genitori/Tutori ancora salvati: solo lettura e
  // rimozione (invio senza alcuno slot compilato = eliminazione di tutti).
  if (dati.soloRimozione) {
    return (
      <form onSubmit={invia} className={styles.formTutori}>
        <input type="hidden" name="atletaId" value={atletaId} />
        <p className={styles.notaTutori}>
          {nome} è maggiorenne: i Genitori/Tutori salvati non sono più modificabili, possono solo
          essere rimossi.
        </p>
        <ul className={styles.notaTutori}>
          {dati.tutori.map((t) => (
            <li key={t.posizione}>
              Genitore/Tutore {t.posizione}: {t.nome} ({t.codiceFiscale})
              {t.intestatarioRicevuta ? " - intestatario ricevuta" : ""}
            </li>
          ))}
        </ul>
        {errore}
        <div className={styles.azioniCompatto}>
          <button disabled={pending} type="submit" className={styles.bottone}>
            Rimuovi Genitori/Tutori
          </button>
          {annulla}
        </div>
      </form>
    );
  }

  const tutorePer = (posizione: 1 | 2) =>
    dati.tutori.find((t) => t.posizione === posizione);
  const intestatarioAttuale = dati.tutori.find((t) => t.intestatarioRicevuta)?.posizione;
  const base = `tutori-${idPrefisso}-${atletaId}`;

  return (
    <form onSubmit={invia} className={styles.formTutori}>
      <input type="hidden" name="atletaId" value={atletaId} />
      <p className={styles.notaTutori}>
        Genitori/Tutori di {nome}. Lascia vuoto &quot;Cognome e Nome&quot; per non indicare (o
        rimuovere) un Genitore/Tutore.
      </p>
      {([1, 2] as const).map((posizione) => {
        const tutore = tutorePer(posizione);
        // Un account salvato che non e' piu' tra i Genitori collegati
        // all'Atleta resta comunque selezionato (opzione dedicata): senza,
        // la select ricadrebbe su "Nessun account" e il prossimo
        // salvataggio lo scollegherebbe senza avviso.
        const utenteOrfano =
          tutore?.utenteId &&
          !dati.genitoriCollegati.some((g) => g.utenteId === tutore.utenteId)
            ? tutore.utenteId
            : null;
        return (
          <fieldset key={posizione} className={styles.fieldsetTutore}>
            <legend>Genitore/Tutore {posizione}</legend>
            {CAMPI_TESTO.map(({ campo, etichetta, ...attributi }) => {
              const id = `${base}-${posizione}-${campo}`;
              const valore = tutore?.[campo];
              return (
                <div key={campo} className={styles.campoTutore}>
                  <label htmlFor={id}>{etichetta}</label>
                  <input
                    id={id}
                    name={`tutore${posizione}_${campo}`}
                    {...attributi}
                    defaultValue={typeof valore === "string" ? valore : ""}
                  />
                </div>
              );
            })}
            <div className={styles.campoTutore}>
              <label htmlFor={`${base}-${posizione}-utenteId`}>
                Account collegato (opzionale)
              </label>
              <select
                id={`${base}-${posizione}-utenteId`}
                name={`tutore${posizione}_utenteId`}
                defaultValue={tutore?.utenteId ?? ""}
              >
                <option value="">Nessun account</option>
                {utenteOrfano && (
                  <option value={utenteOrfano}>
                    Account collegato (non più genitore dell&apos;Atleta)
                  </option>
                )}
                {dati.genitoriCollegati.map((g) => (
                  <option key={g.utenteId} value={g.utenteId}>
                    {g.email}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        );
      })}
      <fieldset className={styles.fieldsetTutore}>
        <legend>Intestatario ricevuta</legend>
        {(
          [
            { valore: "", etichetta: "Nessuno" },
            { valore: "1", etichetta: "Genitore/Tutore 1" },
            { valore: "2", etichetta: "Genitore/Tutore 2" },
          ] as const
        ).map(({ valore, etichetta }) => (
          <label key={valore || "nessuno"} className={styles.opzioneRadio}>
            <input
              type="radio"
              name="intestatarioRicevuta"
              value={valore}
              defaultChecked={
                valore === "" ? intestatarioAttuale === undefined : intestatarioAttuale === Number(valore)
              }
            />
            {etichetta}
          </label>
        ))}
      </fieldset>
      {errore}
      <div className={styles.azioniCompatto}>
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva
        </button>
        {annulla}
      </div>
    </form>
  );
}

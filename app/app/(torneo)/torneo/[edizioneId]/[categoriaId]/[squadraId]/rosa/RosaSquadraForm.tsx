"use client";

import { useActionState, useState } from "react";
import { salvaRosaSquadraAction, type RosaActionState } from "../../../../actions";
import type { RigaGiocatoreTesto, RigaTesseratoTesto } from "@/lib/rose-modulo";
import styles from "../../../../torneo.module.css";

// Referto elettronico, story 3.9: modulo della rosa di una Squadra. Campi
// controllati: dopo un rifiuto i valori scritti restano. La pagina rimonta il
// modulo (key sulla versione) dopo un salvataggio riuscito.

const RUOLI = [
  { valore: "A", etichetta: "A - Allenatore" },
  { valore: "VA", etichetta: "VA - Vice allenatore" },
  { valore: "M", etichetta: "M - Massaggiatore" },
  { valore: "FT", etichetta: "FT - Fisioterapista" },
  { valore: "D", etichetta: "D - Dirigente" },
];

const GIOCATORE_VUOTO: RigaGiocatoreTesto = { numero: "", nome: "", cognome: "", capitano: false, libero: false };
const TESSERATO_VUOTO: RigaTesseratoTesto = { ruolo: "", nome: "" };

type Props = {
  edizioneTorneoId: string;
  categoriaTorneoId: string;
  squadraTorneoId: string;
  versioneBase: number;
  giocatoriIniziali: RigaGiocatoreTesto[];
  tesseratiIniziali: RigaTesseratoTesto[];
};

// Lo stato dell'azione vive qui, sopra il modulo con key sulla versione: il
// modulo si rimonta coi dati del server dopo il salvataggio, la conferma resta.
export function RosaSquadraForm(props: Props) {
  const [state, formAction, pending] = useActionState<RosaActionState, FormData>(
    salvaRosaSquadraAction,
    undefined
  );
  return (
    <>
      <CampiRosa key={props.versioneBase} {...props} state={state} formAction={formAction} pending={pending} />
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Rosa salvata (versione {state.versione}).
        </p>
      )}
    </>
  );
}

function CampiRosa({
  edizioneTorneoId,
  categoriaTorneoId,
  squadraTorneoId,
  versioneBase,
  giocatoriIniziali,
  tesseratiIniziali,
  state,
  formAction,
  pending,
}: Props & {
  state: RosaActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [giocatori, setGiocatori] = useState<RigaGiocatoreTesto[]>(
    giocatoriIniziali.length > 0 ? giocatoriIniziali : [GIOCATORE_VUOTO]
  );
  const [tesserati, setTesserati] = useState<RigaTesseratoTesto[]>(tesseratiIniziali);

  const aggiornaG = (i: number, patch: Partial<RigaGiocatoreTesto>) =>
    setGiocatori((righe) => righe.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const aggiornaT = (i: number, patch: Partial<RigaTesseratoTesto>) =>
    setTesserati((righe) => righe.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const errori = state && "error" in state ? (state.errori ?? []) : [];

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="edizioneTorneoId" value={edizioneTorneoId} />
      <input type="hidden" name="categoriaTorneoId" value={categoriaTorneoId} />
      <input type="hidden" name="squadraTorneoId" value={squadraTorneoId} />
      <input type="hidden" name="versioneBase" value={versioneBase} />

      <h2>Giocatori</h2>
      {giocatori.map((g, i) => (
        <div className={styles.campiRiga} key={i}>
          <div className={styles.campo}>
            <label htmlFor={`g${i}_numero`}>Numero</label>
            <input
              id={`g${i}_numero`}
              name={`g${i}_numero`}
              type="text"
              inputMode="numeric"
              value={g.numero}
              onChange={(e) => aggiornaG(i, { numero: e.target.value })}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`g${i}_nome`}>Nome</label>
            <input
              id={`g${i}_nome`}
              name={`g${i}_nome`}
              type="text"
              maxLength={60}
              value={g.nome}
              onChange={(e) => aggiornaG(i, { nome: e.target.value })}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`g${i}_cognome`}>Cognome</label>
            <input
              id={`g${i}_cognome`}
              name={`g${i}_cognome`}
              type="text"
              maxLength={60}
              value={g.cognome}
              onChange={(e) => aggiornaG(i, { cognome: e.target.value })}
            />
          </div>
          <div className={styles.campo}>
            <label>
              <input
                name={`g${i}_capitano`}
                type="checkbox"
                checked={g.capitano}
                onChange={(e) => aggiornaG(i, { capitano: e.target.checked })}
              />{" "}
              Capitano
            </label>
          </div>
          <div className={styles.campo}>
            <label>
              <input
                name={`g${i}_libero`}
                type="checkbox"
                checked={g.libero}
                onChange={(e) => aggiornaG(i, { libero: e.target.checked })}
              />{" "}
              Libero
            </label>
          </div>
          <button
            type="button"
            className={styles.bottoneSecondario}
            disabled={pending}
            onClick={() => setGiocatori((r) => r.filter((_, j) => j !== i))}
            aria-label={`Togli il giocatore ${i + 1}`}
          >
            Togli
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.bottoneSecondario}
        disabled={pending}
        onClick={() => setGiocatori((r) => [...r, GIOCATORE_VUOTO])}
      >
        Aggiungi giocatore
      </button>

      <h2>Tesserati</h2>
      {tesserati.map((t, i) => (
        <div className={styles.campiRiga} key={i}>
          <div className={styles.campo}>
            <label htmlFor={`t${i}_ruolo`}>Ruolo</label>
            <select
              id={`t${i}_ruolo`}
              name={`t${i}_ruolo`}
              value={t.ruolo}
              onChange={(e) => aggiornaT(i, { ruolo: e.target.value })}
            >
              <option value="">— ruolo —</option>
              {RUOLI.map((r) => (
                <option key={r.valore} value={r.valore}>
                  {r.etichetta}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`t${i}_nome`}>Nome</label>
            <input
              id={`t${i}_nome`}
              name={`t${i}_nome`}
              type="text"
              maxLength={60}
              value={t.nome}
              onChange={(e) => aggiornaT(i, { nome: e.target.value })}
            />
          </div>
          <button
            type="button"
            className={styles.bottoneSecondario}
            disabled={pending}
            onClick={() => setTesserati((r) => r.filter((_, j) => j !== i))}
            aria-label={`Togli il tesserato ${i + 1}`}
          >
            Togli
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.bottoneSecondario}
        disabled={pending}
        onClick={() => setTesserati((r) => [...r, TESSERATO_VUOTO])}
      >
        Aggiungi tesserato
      </button>

      <div>
        <button disabled={pending} type="submit" className={styles.bottone}>
          Salva la rosa
        </button>
      </div>
      {state && "error" in state && (
        <div role="alert" className={styles.errore}>
          <p>{state.error.message}</p>
          {errori.length > 0 && (
            <ul>
              {errori.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

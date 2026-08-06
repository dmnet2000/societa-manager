"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { assegnaAllenatore, assegnaAtleta, creaEAssegnaAtleta } from "./actions";
import { AtletaAssegnata, type Atleta } from "./AtletaAssegnata";
import { AllenatoreAssegnato, type Allenatore } from "./AllenatoreAssegnato";
import styles from "./gruppi.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
  allenatori: Allenatore[];
  atlete: Atleta[];
};

// Richiesta esplicita dell'utente (2026-08-06): elenco Gruppi più compatto -
// (a) Allenatori spostati su una riga di tabella distinta a piena larghezza
// (era una colonna stretta accanto ad Atlete, ora sempre più alta per via
// del form "Nuova Atleta"), (b) il form "Nuova Atleta" (6 campi) non è più
// sempre visibile, compare solo dopo click su un pulsante dedicato.
export function GruppoRow({
  gruppo,
  allenatoriDisponibili,
  atleteDisponibili,
}: {
  gruppo: Gruppo;
  allenatoriDisponibili: Allenatore[];
  atleteDisponibili: Atleta[];
}) {
  const [allenatoreState, allenatoreFormAction, allenatorePending] =
    useActionState(assegnaAllenatore, undefined);
  const allenatoreFormRef = useRef<HTMLFormElement>(null);

  const [atletaState, atletaFormAction, atletaPending] = useActionState(
    assegnaAtleta,
    undefined
  );
  const atletaFormRef = useRef<HTMLFormElement>(null);

  // Story 9.28: terzo useActionState indipendente - creaEAssegnaAtleta e'
  // una Server Action distinta da assegnaAtleta, con esito indipendente,
  // stesso principio gia' seguito da MioGruppoCard.tsx (Story 9.18).
  const [nuovaAtletaState, nuovaAtletaFormAction, nuovaAtletaPending] = useActionState(
    creaEAssegnaAtleta,
    undefined
  );
  const nuovaAtletaFormRef = useRef<HTMLFormElement>(null);

  // Pannello "Nuova Atleta" collassato di default - visibile solo dopo click
  // su "Nuovo Atleta". Ricollasso automatico dopo una creazione riuscita con
  // "adjust state during render" (stesso pattern di ModificaCampionatoForm.tsx/
  // SlotRow.tsx, Story 10.8/15.5), non un useEffect con setState - violerebbe
  // react-hooks/set-state-in-effect.
  const [mostraNuovaAtleta, setMostraNuovaAtleta] = useState(false);
  const [ultimoNuovaAtletaState, setUltimoNuovaAtletaState] = useState(nuovaAtletaState);
  if (nuovaAtletaState !== ultimoNuovaAtletaState) {
    setUltimoNuovaAtletaState(nuovaAtletaState);
    if (nuovaAtletaState && "success" in nuovaAtletaState) {
      setMostraNuovaAtleta(false);
    }
  }

  // Review fix: senza il reset, il <select> restava sull'ultimo Allenatore
  // scelto dopo un'assegnazione riuscita, a differenza di NuovoGruppoForm/
  // NuovoCampoForm (Story 2.1/2.2) che resettano il form al successo.
  useEffect(() => {
    if (allenatoreState && "success" in allenatoreState) {
      allenatoreFormRef.current?.reset();
    }
  }, [allenatoreState]);

  // Stesso pattern di reset applicato al form Atlete (Story 2.4).
  useEffect(() => {
    if (atletaState && "success" in atletaState) {
      atletaFormRef.current?.reset();
    }
  }, [atletaState]);

  // Stesso pattern di reset per il form "Nuova Atleta" (Story 9.28/9.18).
  useEffect(() => {
    if (nuovaAtletaState && "success" in nuovaAtletaState) {
      nuovaAtletaFormRef.current?.reset();
    }
  }, [nuovaAtletaState]);

  return (
    <>
      <tr className={styles.rigaPrincipale}>
        <td>{gruppo.nome}</td>
        <td>{gruppo.categoria}</td>
        <td>
          <ul className={styles.listaAssegnati}>
            {gruppo.atlete.map((atleta) => (
              <AtletaAssegnata
                key={atleta.id}
                gruppoId={gruppo.id}
                gruppoNome={gruppo.nome}
                atleta={atleta}
              />
            ))}
          </ul>
          <form
            ref={atletaFormRef}
            action={atletaFormAction}
            className={styles.formCompatto}
          >
            <input type="hidden" name="gruppoId" value={gruppo.id} />
            <label htmlFor={`assegna-atleta-${gruppo.id}`}>Assegna Atleta</label>
            <select id={`assegna-atleta-${gruppo.id}`} name="atletaId" required>
              <option value="">Seleziona...</option>
              {atleteDisponibili.map((atleta) => (
                <option key={atleta.id} value={atleta.id}>
                  {atleta.nome}
                </option>
              ))}
            </select>
            {atletaState && "error" in atletaState && (
              <p role="alert" className={styles.errore}>
                {atletaState.error.message}
              </p>
            )}
            <button
              disabled={atletaPending}
              type="submit"
              className={styles.bottoneCompatto}
            >
              Assegna
            </button>
          </form>

          {!mostraNuovaAtleta ? (
            <button
              type="button"
              onClick={() => setMostraNuovaAtleta(true)}
              className={styles.bottoneCompatto}
            >
              Nuovo Atleta
            </button>
          ) : (
            <>
              {/* Story 9.28: un'Atleta non ancora in anagrafica non compare in
                  "Assegna Atleta" sopra - questo secondo form la crea e la
                  assegna in un solo passaggio, stesso principio gia' presente
                  in MioGruppoCard.tsx (Story 9.18) lato Allenatore. */}
              <p className={styles.separatoreCompatto}>Nuova Atleta</p>
              <form
                ref={nuovaAtletaFormRef}
                action={nuovaAtletaFormAction}
                className={styles.formCompatto}
              >
                <input type="hidden" name="gruppoId" value={gruppo.id} />
                <label htmlFor={`nuova-atleta-cognome-${gruppo.id}`}>Cognome</label>
                <input
                  id={`nuova-atleta-cognome-${gruppo.id}`}
                  type="text"
                  name="cognome"
                  required
                />
                <label htmlFor={`nuova-atleta-nome-${gruppo.id}`}>Nome</label>
                <input
                  id={`nuova-atleta-nome-${gruppo.id}`}
                  type="text"
                  name="nome"
                  required
                />
                <label htmlFor={`nuova-atleta-data-nascita-${gruppo.id}`}>
                  Data di nascita
                </label>
                <input
                  id={`nuova-atleta-data-nascita-${gruppo.id}`}
                  type="date"
                  name="dataNascita"
                  required
                />
                <label htmlFor={`nuova-atleta-codice-fiscale-${gruppo.id}`}>
                  Codice Fiscale
                </label>
                <input
                  id={`nuova-atleta-codice-fiscale-${gruppo.id}`}
                  type="text"
                  name="codiceFiscale"
                  required
                />
                <label htmlFor={`nuova-atleta-email-${gruppo.id}`}>
                  Email (opzionale)
                </label>
                <input id={`nuova-atleta-email-${gruppo.id}`} type="email" name="email" />
                <label htmlFor={`nuova-atleta-cellulare-${gruppo.id}`}>
                  Cellulare (opzionale)
                </label>
                <input
                  id={`nuova-atleta-cellulare-${gruppo.id}`}
                  type="tel"
                  name="cellulare"
                />
                {nuovaAtletaState && "error" in nuovaAtletaState && (
                  <p role="alert" className={styles.errore}>
                    {nuovaAtletaState.error.message}
                  </p>
                )}
                <div className={styles.azioniCompatto}>
                  <button
                    disabled={nuovaAtletaPending}
                    type="submit"
                    className={styles.bottoneCompatto}
                  >
                    Crea e assegna
                  </button>
                  <button
                    type="button"
                    disabled={nuovaAtletaPending}
                    onClick={() => setMostraNuovaAtleta(false)}
                    className={styles.bottoneCompatto}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </>
          )}
        </td>
      </tr>
      <tr className={styles.rigaAllenatori}>
        <td colSpan={3}>
          <span className={styles.etichettaAllenatori}>Allenatori:</span>
          <ul className={styles.listaAssegnatiInline}>
            {gruppo.allenatori.map((allenatore) => (
              <AllenatoreAssegnato
                key={allenatore.id}
                gruppoId={gruppo.id}
                gruppoNome={gruppo.nome}
                allenatore={allenatore}
              />
            ))}
          </ul>
          <form
            ref={allenatoreFormRef}
            action={allenatoreFormAction}
            className={`${styles.formCompatto} ${styles.formInline}`}
          >
            <input type="hidden" name="gruppoId" value={gruppo.id} />
            <label htmlFor={`assegna-allenatore-${gruppo.id}`}>
              Assegna Allenatore
            </label>
            <select id={`assegna-allenatore-${gruppo.id}`} name="allenatoreId" required>
              <option value="">Seleziona...</option>
              {allenatoriDisponibili.map((allenatore) => (
                <option key={allenatore.id} value={allenatore.id}>
                  {allenatore.nome} {allenatore.cognome}
                </option>
              ))}
            </select>
            <button
              disabled={allenatorePending}
              type="submit"
              className={styles.bottoneCompatto}
            >
              Assegna
            </button>
            {allenatoreState && "error" in allenatoreState && (
              <p role="alert" className={styles.errore}>
                {allenatoreState.error.message}
              </p>
            )}
          </form>
        </td>
      </tr>
    </>
  );
}

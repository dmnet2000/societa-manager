"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  aggiornaGruppoAction,
  assegnaAllenatore,
  assegnaAtleta,
  creaEAssegnaAtleta,
} from "./actions";
import type { Atleta } from "./AtletaAssegnata";
import { AtletaTabellaRiga, type AtletaConStato } from "./AtletaTabellaRiga";
import { AllenatoreAssegnato, type Allenatore } from "./AllenatoreAssegnato";
import { FotoSquadraForm } from "./FotoSquadraForm";
import styles from "./gruppi.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
  allenatori: Allenatore[];
  atlete: AtletaConStato[];
};

// Richiesta esplicita dell'utente (2026-08-06): elenco Gruppi più compatto -
// (a) Allenatori su riga di tabella distinta a piena larghezza (fatto senza
// story formale, in precedenza), (b) Story 9.33: stesso trattamento
// applicato alle Atlete - riga distinta propria, elenco orizzontale invece
// che colonna verticale. La rigaPrincipale ha quindi solo 2 colonne
// (Nome/Categoria) - sia rigaAtlete sia rigaAllenatori usano colSpan={2}.
export function GruppoRow({
  gruppo,
  allenatoriDisponibili,
  atleteDisponibili,
  fotoEsiste,
  fotoUrl,
  fotoAggiornataIl,
}: {
  gruppo: Gruppo;
  allenatoriDisponibili: Allenatore[];
  atleteDisponibili: Atleta[];
  fotoEsiste: boolean;
  fotoUrl: string;
  fotoAggiornataIl: string | null;
}) {
  // Story 9.37: toggle sola-lettura/modifica per nome/categoria del
  // Gruppo, mirror di CategoriaTorneoRow.tsx (Story 20.1) - stessa
  // "adjust state during render" per ricollassare al successo, invece di
  // un useEffect con setState.
  const [inModificaGruppo, setInModificaGruppo] = useState(false);
  const [modificaGruppoState, modificaGruppoAction, modificaGruppoPending] =
    useActionState(aggiornaGruppoAction, undefined);
  // Review fix (Blind Hunter + Edge Case Hunter, convergenza): senza un
  // flag di visibilita' dedicato, un errore di un tentativo precedente
  // riapparirebbe subito riaprendo "Modifica" dopo "Annulla" - modificaGruppoState
  // (useActionState) resta invariato quando si chiude/riapre il form, il
  // toggle inModificaGruppo cambia solo la porzione di JSX renderizzata, non
  // smonta questo componente. Stesso identico fix gia' applicato in
  // CategoriaTorneoRow.tsx (erroreModificaVisibile).
  const [ultimoModificaGruppoState, setUltimoModificaGruppoState] =
    useState(modificaGruppoState);
  const [erroreModificaGruppoVisibile, setErroreModificaGruppoVisibile] =
    useState(false);
  if (modificaGruppoState !== ultimoModificaGruppoState) {
    setUltimoModificaGruppoState(modificaGruppoState);
    if (modificaGruppoState && "success" in modificaGruppoState) {
      setInModificaGruppo(false);
      setErroreModificaGruppoVisibile(false);
    } else if (modificaGruppoState && "error" in modificaGruppoState) {
      setErroreModificaGruppoVisibile(true);
    }
  }

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
        <td>
          {/* Review fix (Blind Hunter): bottone testuale invece dell'icona
              di icone-azione-riga.tsx (mirror parziale e deliberato di
              CategoriaTorneoRow.tsx) - la rigaPrincipale ha solo 2 colonne
              (Nome/Categoria, Story 9.33), aggiungere una terza colonna
              "azioni" avrebbe richiesto aggiornare ogni colSpan={2} usato
              altrove in questo file (rigaAtlete/rigaAllenatori/
              rigaFotoSquadra) - un bottone testuale dentro la cella
              esistente evita quella cascata invasiva. */}
          {gruppo.categoria}{" "}
          <button
            type="button"
            className={styles.bottoneCompatto}
            onClick={() => {
              setInModificaGruppo(true);
              setErroreModificaGruppoVisibile(false);
            }}
            disabled={inModificaGruppo}
            aria-label={`Modifica ${gruppo.nome}`}
          >
            Modifica
          </button>
        </td>
      </tr>
      {inModificaGruppo && (
        <tr className={styles.rigaModificaGruppo}>
          <td colSpan={2}>
            <form action={modificaGruppoAction} className={styles.formModificaGruppo}>
              <input type="hidden" name="id" value={gruppo.id} />
              <div className={styles.campo}>
                <label htmlFor={`gruppo-nome-${gruppo.id}`}>Nome</label>
                <input
                  id={`gruppo-nome-${gruppo.id}`}
                  name="nome"
                  type="text"
                  defaultValue={gruppo.nome}
                  required
                />
              </div>
              <div className={styles.campo}>
                <label htmlFor={`gruppo-categoria-${gruppo.id}`}>Categoria</label>
                <input
                  id={`gruppo-categoria-${gruppo.id}`}
                  name="categoria"
                  type="text"
                  defaultValue={gruppo.categoria}
                  required
                />
              </div>
              {erroreModificaGruppoVisibile &&
                modificaGruppoState &&
                "error" in modificaGruppoState && (
                  <p role="alert" className={styles.errore}>
                    {modificaGruppoState.error.message}
                  </p>
                )}
              <div className={styles.azioniCompatto}>
                <button
                  disabled={modificaGruppoPending}
                  type="submit"
                  className={styles.bottone}
                  aria-label={`Salva ${gruppo.nome}`}
                >
                  Salva
                </button>
                <button
                  type="button"
                  disabled={modificaGruppoPending}
                  className={styles.bottoneSecondario}
                  onClick={() => setInModificaGruppo(false)}
                  aria-label={`Annulla la modifica di ${gruppo.nome}`}
                >
                  Annulla
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
      <tr className={styles.rigaAtlete}>
        <td colSpan={2}>
          <span className={styles.etichettaRigaEstesa}>Atlete:</span>

          {/* Richiesta utente 2026-08-06 (estensione Story 9.33, round 3):
              "riga di assegna atlete", "riga successiva pulsante nuovo
              atleta", "righe successive, lista atlete" - tre blocchi
              impilati ognuno sulla propria riga (.rigaAtlete td ora
              flex-direction:column), non piu' un unico blocco con
              flex-wrap. Il form Assegna Atleta resta internamente in riga
              (dropdown + pulsante a fianco, .formInline). */}
          <form
            ref={atletaFormRef}
            action={atletaFormAction}
            className={`${styles.formCompatto} ${styles.formInline}`}
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
            <button
              disabled={atletaPending}
              type="submit"
              className={styles.bottoneCompatto}
            >
              Assegna
            </button>
            {atletaState && "error" in atletaState && (
              <p role="alert" className={styles.errore}>
                {atletaState.error.message}
              </p>
            )}
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
            // Review fix (Edge Case Hunter, Story 9.33): un Fragment qui
            // lascerebbe separatore e form come due elementi flessibili
            // indipendenti dentro .rigaAtlete td (ora display:flex), perdendo
            // il raggruppamento visivo che avevano quando il <td> era a
            // layout di blocco normale - un unico contenitore li rende un
            // solo elemento della riga flessibile esterna.
            <div className={styles.pannelloNuovaAtleta}>
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
            </div>
          )}

          {gruppo.atlete.length > 0 && (
            <table className={styles.tabellaAtlete}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Numero</th>
                  <th>Certificato</th>
                  <th>Iscrizione</th>
                  <th>Tesseramento</th>
                  <th>Rimuovi</th>
                </tr>
              </thead>
              <tbody>
                {gruppo.atlete.map((atleta) => (
                  <AtletaTabellaRiga
                    key={atleta.id}
                    gruppoId={gruppo.id}
                    gruppoNome={gruppo.nome}
                    atleta={atleta}
                  />
                ))}
              </tbody>
            </table>
          )}
        </td>
      </tr>
      <tr className={styles.rigaAllenatori}>
        <td colSpan={2}>
          <span className={styles.etichettaRigaEstesa}>Allenatori:</span>
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
      <tr className={styles.rigaFotoSquadra}>
        <td colSpan={2}>
          <span className={styles.etichettaRigaEstesa}>Foto squadra:</span>
          <FotoSquadraForm
            gruppoId={gruppo.id}
            gruppoNome={gruppo.nome}
            fotoEsiste={fotoEsiste}
            fotoUrl={fotoUrl}
            fotoAggiornataIl={fotoAggiornataIl}
          />
        </td>
      </tr>
    </>
  );
}

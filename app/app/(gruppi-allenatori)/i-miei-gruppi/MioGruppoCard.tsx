"use client";

import { useActionState, useEffect, useRef } from "react";
import { assegnaAtleta, creaEAssegnaAtleta } from "../gruppi/actions";
import type { Atleta } from "../gruppi/AtletaAssegnata";
import { AtletaTabellaRiga, type AtletaConStato } from "../gruppi/AtletaTabellaRiga";
import { FotoSquadraForm } from "../gruppi/FotoSquadraForm";
import styles from "./i-miei-gruppi.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
};

// Story 9.15: card per Gruppo invece della riga di tabella di GruppoRow.tsx
// (quella pagina resta ADMIN/DIRIGENTE-only, invariata) - stessa Server
// Action (assegnaAtleta) riusata invariata.
// Richiesta utente 2026-08-07: stesso layout a 5 colonne di /gruppi (Story
// 9.33, round 4/5) - riusato direttamente AtletaTabellaRiga.tsx (non piu'
// AtletaAssegnata.tsx, <li>-based, che diventa dead code, vedi
// AtletaAssegnata.tsx) invece di duplicarne la logica, stesso principio di
// import cross-cartella gia' in uso in questo file per actions.ts.
export function MioGruppoCard({
  gruppo,
  atlete,
  atleteDisponibili,
  fotoEsiste,
  fotoUrl,
  fotoAggiornataIl,
}: {
  gruppo: Gruppo;
  atlete: AtletaConStato[];
  atleteDisponibili: Atleta[];
  fotoEsiste: boolean;
  fotoUrl: string;
  fotoAggiornataIl: string | null;
}) {
  const [state, formAction, pending] = useActionState(assegnaAtleta, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Stesso pattern di reset gia' usato in GruppoRow.tsx (Story 2.4/9.15).
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  // Story 9.18: secondo useActionState indipendente per il form "Nuova
  // Atleta" - stesso pattern di reset del form "Assegna Atleta" sopra,
  // nessuna window.confirm qui (si sta creando un'Atleta nuova, non
  // spostando un'assegnazione esistente da un altro Gruppo/Allenatore -
  // Story 9.15 review fix - nessun rischio equivalente).
  const [nuovaAtletaState, nuovaAtletaFormAction, nuovaAtletaPending] = useActionState(
    creaEAssegnaAtleta,
    undefined
  );
  const nuovaAtletaFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (nuovaAtletaState && "success" in nuovaAtletaState) {
      nuovaAtletaFormRef.current?.reset();
    }
  }, [nuovaAtletaState]);

  return (
    <section className={styles.card}>
      <h2>{gruppo.nome}</h2>
      <p className={styles.categoria}>{gruppo.categoria}</p>
      <FotoSquadraForm
        gruppoId={gruppo.id}
        gruppoNome={gruppo.nome}
        fotoEsiste={fotoEsiste}
        fotoUrl={fotoUrl}
        fotoAggiornataIl={fotoAggiornataIl}
      />
      {atlete.length === 0 ? (
        <p className={styles.nessunaAtleta}>Nessuna Atleta assegnata.</p>
      ) : (
        <div className={styles.scrollAtlete}>
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
              {atlete.map((atleta) => (
                <AtletaTabellaRiga
                  key={atleta.id}
                  gruppoId={gruppo.id}
                  gruppoNome={gruppo.nome}
                  atleta={atleta}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form
        ref={formRef}
        action={formAction}
        className={styles.formAssegna}
        onSubmit={(e) => {
          // Review fix (code review Story 9.15): stessa cautela gia' usata
          // per la rimozione (AtletaTabellaRiga.tsx) - il <select> include
          // anche Atlete gia' assegnate al Gruppo di un altro Allenatore
          // (riassegnazione self-service esplicitamente accettata), senza
          // conferma un misclick le assegnerebbe in silenzio. Story 9.21:
          // assegnaAtleta e' ora sempre additiva (non "sposta" piu' nulla),
          // ma la stessa cautela resta valida per lo stesso motivo -
          // un'assegnazione indesiderata a un Gruppo che non e' il suo.
          const select = e.currentTarget.elements.namedItem(
            "atletaId"
          ) as HTMLSelectElement | null;
          const nomeAtleta =
            select?.selectedOptions[0]?.textContent ?? "questa Atleta";
          if (
            !window.confirm(
              `Assegnare ${nomeAtleta} al Gruppo ${gruppo.nome}?`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="gruppoId" value={gruppo.id} />
        <div>
          <label htmlFor={`assegna-atleta-${gruppo.id}`}>Assegna Atleta</label>
          <select id={`assegna-atleta-${gruppo.id}`} name="atletaId" required>
            <option value="">Seleziona...</option>
            {atleteDisponibili.map((atleta) => (
              <option key={atleta.id} value={atleta.id}>
                {atleta.nome}
              </option>
            ))}
          </select>
        </div>
        <button disabled={pending} type="submit" className={styles.bottone}>
          Assegna
        </button>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
      </form>
      {/* Story 9.18 (AC #1): un'Atleta non ancora in anagrafica non compare
          in "Assegna Atleta" sopra - questo secondo form la crea e la
          assegna in un solo passaggio. sesso derivato dal Codice Fiscale,
          non richiesto qui (Dev Notes story file). */}
      <form
        ref={nuovaAtletaFormRef}
        action={nuovaAtletaFormAction}
        className={styles.formNuovaAtleta}
      >
        <input type="hidden" name="gruppoId" value={gruppo.id} />
        <h3>Nuova Atleta</h3>
        <label>
          Cognome
          <input type="text" name="cognome" required />
        </label>
        <label>
          Nome
          <input type="text" name="nome" required />
        </label>
        <label>
          Data di nascita
          <input type="date" name="dataNascita" required />
        </label>
        <label>
          Codice Fiscale
          <input type="text" name="codiceFiscale" required />
        </label>
        <label>
          Email (opzionale)
          <input type="email" name="email" />
        </label>
        <label>
          Cellulare (opzionale)
          <input type="tel" name="cellulare" />
        </label>
        <button
          disabled={nuovaAtletaPending}
          type="submit"
          className={styles.bottone}
        >
          Crea e assegna
        </button>
        {nuovaAtletaState && "error" in nuovaAtletaState && (
          <p role="alert" className={styles.errore}>
            {nuovaAtletaState.error.message}
          </p>
        )}
      </form>
    </section>
  );
}

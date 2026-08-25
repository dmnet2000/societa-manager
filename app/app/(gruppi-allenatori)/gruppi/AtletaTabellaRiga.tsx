"use client";

import { useActionState, useState } from "react";
import { rimuoviAtleta, impostaNumeroAtletaAction } from "./actions";
import type { Atleta } from "./AtletaAssegnata";
import { formattaDataScadenzaCertificato } from "@/lib/certificato-in-scadenza-per-atleta";
import styles from "./gruppi.module.css";

// Richiesta utente 2026-08-07: Iscrizione/Tesseramento aggiunti SOLO qui
// (non nel tipo Atleta condiviso di AtletaAssegnata.tsx, usato anche da
// /i-miei-gruppi) - evita di ripetere la duplicazione di tipo gia'
// segnalata come [Review][Defer] nella code review round 3 di Story 9.33
// per certificatoScaduto, che invece era stato aggiunto al tipo condiviso
// pur essendo consumato solo qui.
// Story 9.35: "numero" aggiunto qui (non al tipo condiviso Atleta di
// AtletaAssegnata.tsx) per lo stesso motivo gia' documentato sopra per
// iscritta/tesserata - specifico della riga GruppoAtleta (Atleta+Gruppo+
// Stagione), mai valorizzato per un'Atleta nel <select> "disponibili" (non
// ancora assegnata a nessun Gruppo, quindi senza una riga GruppoAtleta da
// cui leggerlo).
export type AtletaConStato = Atleta & {
  iscritta: boolean;
  tesserata: boolean;
  numero: number | null;
};

// Richiesta utente 2026-08-06 (estensione Story 9.33): nome completo
// dell'Atleta, gia' "Cognome Nome" per convenzione pre-esistente
// dell'anagrafica - non l'ordine letterale "Nome Cognome" della richiesta.
// Colonna Certificato: badge solo se scaduto/in scadenza (altrimenti vuota),
// scaduto ha priorita' su in scadenza (stato mutuamente esclusivo, ma se mai
// coesistessero mostrare solo il piu' grave evita due badge nella stessa
// cella). Review fix (Blind Hunter, round 3): il badge "Certificato scaduto"
// usa la stessa variante warning di "in scadenza", non danger - regola "non
// negoziabile" di DESIGN.md (Componenti -> Badge di stato), la cui unica
// eccezione documentata (danger su singola Atleta) e' /conferma-certificati
// (Story 9.23) e non va estesa altrove senza una nuova decisione esplicita.
// Colonne Iscrizione/Tesseramento (2026-08-07): sempre un badge, mai vuote a
// differenza del Certificato - sono stati binari, non "solo se problema".
// Danger per "Non iscritta"/"Non tesserata" confermato esplicitamente con
// l'utente - non e' lo stesso badge "Certificato scaduto" a cui si applica
// la regola non negoziabile sopra, quindi non la viola.
export function AtletaTabellaRiga({
  gruppoId,
  gruppoNome,
  atleta,
}: {
  gruppoId: string;
  gruppoNome: string;
  atleta: AtletaConStato;
}) {
  const [state, formAction, pending] = useActionState(rimuoviAtleta, undefined);
  // Story 9.35: useActionState indipendente per il form "Numero" - stessa
  // riga di tabella, esito indipendente dal form di rimozione sopra (mirror
  // del pattern gia' in uso in VoceMenuPubblicoRow.tsx, piu' form/
  // useActionState indipendenti sulla stessa riga/card).
  const [numeroState, numeroFormAction, numeroPending] = useActionState(
    impostaNumeroAtletaAction,
    undefined
  );
  // Story 9.34: toggle locale per rivelare/nascondere la data di scadenza
  // dietro al badge - nessuna Server Action coinvolta, mirror del pattern
  // gia' in uso in GruppoCard.tsx (vista-dirigente/vista-allenatore) per i
  // drill-down.
  const [mostraData, setMostraData] = useState(false);
  const haBadge = atleta.certificatoScaduto || atleta.certificatoInScadenza;
  const dataScadenzaId = `data-scadenza-${atleta.id}`;
  // Review fix (Blind Hunter): chiave composita gruppoId+atletaId, non solo
  // atleta.id - un'Atleta puo' essere assegnata a piu' Gruppi contemporaneamente
  // (Story 9.21), quindi in /gruppi (che elenca tutti i Gruppi della stagione)
  // la stessa Atleta puo' comparire in piu' righe: un id solo su atleta.id
  // produrrebbe id HTML duplicati (label/input scollegati) tra quelle righe.
  const numeroInputId = `numero-atleta-${gruppoId}-${atleta.id}`;

  return (
    <tr>
      <td>{atleta.nome}</td>
      <td>
        {/* Story 9.35: form indipendente (proprio useActionState), sempre
            visibile/editabile - a differenza del badge Certificato sopra,
            il Numero non e' uno stato condizionale da rivelare, e' un dato
            facoltativo sempre modificabile. */}
        <form action={numeroFormAction} className={styles.formNumero}>
          <input type="hidden" name="gruppoId" value={gruppoId} />
          <input type="hidden" name="atletaId" value={atleta.id} />
          <label className={styles.srOnly} htmlFor={numeroInputId}>
            Numero di {atleta.nome}
          </label>
          <input
            // Review fix (Verification Gap Reviewer + Edge Case Hunter +
            // Blind Hunter, convergenti su tutti e 3): defaultValue non si
            // aggiorna dopo un salvataggio riuscito (input non controllato,
            // stessa istanza React prima/dopo revalidatePath) - un secondo
            // salvataggio concorrente (altra tab, altro Utente) restava
            // invisibile finche' non si ricaricava la pagina a mano. La key
            // include ora il valore stesso: quando atleta.numero cambia (un
            // nuovo giro di dati dal server dopo revalidatePath), React
            // smonta/rimonta l'input, riapplicando defaultValue al valore
            // fresco invece di conservare lo stato del vecchio input.
            key={atleta.numero ?? "vuoto"}
            id={numeroInputId}
            name="numero"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            defaultValue={atleta.numero ?? ""}
            className={styles.inputNumero}
          />
          <button
            disabled={numeroPending}
            type="submit"
            className={styles.bottoneCompatto}
            aria-label={`Salva Numero di ${atleta.nome}`}
          >
            Salva
          </button>
        </form>
        {numeroState && "error" in numeroState && (
          <p role="alert" className={styles.errore}>
            {numeroState.error.message}
          </p>
        )}
        {/* Review fix (Blind Hunter): nessun feedback visibile su successo -
            combinato con il defaultValue stantio (fix sopra), l'Utente non
            aveva alcuna conferma che il salvataggio fosse avvenuto. */}
        {numeroState && "success" in numeroState && (
          <p role="status" className={styles.successo}>
            Salvato.
          </p>
        )}
      </td>
      <td>
        {haBadge && (
          <>
            <button
              type="button"
              className={styles.badgeBottone}
              onClick={() => setMostraData((v) => !v)}
              aria-expanded={mostraData}
              aria-controls={dataScadenzaId}
            >
              {atleta.certificatoScaduto ? "Certificato scaduto" : "Certificato in scadenza"}
            </button>
            {mostraData && atleta.dataFineValidita && (
              <span id={dataScadenzaId} className={styles.dataScadenza}>
                {formattaDataScadenzaCertificato(atleta.dataFineValidita)}
              </span>
            )}
          </>
        )}
      </td>
      <td>
        {atleta.iscritta ? (
          <span className={styles.badgeSuccesso}>Iscritta</span>
        ) : (
          <span className={styles.badgeDanger}>Non iscritta</span>
        )}
      </td>
      <td>
        {atleta.tesserata ? (
          <span className={styles.badgeSuccesso}>Tesserata</span>
        ) : (
          <span className={styles.badgeDanger}>Non tesserata</span>
        )}
      </td>
      <td>
        <form
          action={formAction}
          onSubmit={(e) => {
            if (!window.confirm(`Rimuovere ${atleta.nome} dal Gruppo ${gruppoNome}?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="gruppoId" value={gruppoId} />
          <input type="hidden" name="atletaId" value={atleta.id} />
          <button
            disabled={pending}
            type="submit"
            className={styles.bottoneRimuovi}
            aria-label={`Rimuovi ${atleta.nome} dal Gruppo ${gruppoNome}`}
          >
            Rimuovi
          </button>
        </form>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
      </td>
    </tr>
  );
}

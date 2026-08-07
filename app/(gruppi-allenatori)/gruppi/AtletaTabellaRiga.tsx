"use client";

import { useActionState } from "react";
import { rimuoviAtleta } from "./actions";
import type { Atleta } from "./AtletaAssegnata";
import styles from "./gruppi.module.css";

// Richiesta utente 2026-08-07: Iscrizione/Tesseramento aggiunti SOLO qui
// (non nel tipo Atleta condiviso di AtletaAssegnata.tsx, usato anche da
// /i-miei-gruppi) - evita di ripetere la duplicazione di tipo gia'
// segnalata come [Review][Defer] nella code review round 3 di Story 9.33
// per certificatoScaduto, che invece era stato aggiunto al tipo condiviso
// pur essendo consumato solo qui.
export type AtletaConStato = Atleta & { iscritta: boolean; tesserata: boolean };

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

  return (
    <tr>
      <td>{atleta.nome}</td>
      <td>
        {atleta.certificatoScaduto ? (
          <span className={styles.badge}>Certificato scaduto</span>
        ) : (
          atleta.certificatoInScadenza && (
            <span className={styles.badge}>Certificato in scadenza</span>
          )
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

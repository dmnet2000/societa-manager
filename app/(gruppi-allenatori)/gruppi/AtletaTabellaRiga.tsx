"use client";

import { useActionState } from "react";
import { rimuoviAtleta } from "./actions";
import type { Atleta } from "./AtletaAssegnata";
import styles from "./gruppi.module.css";

// Richiesta esplicita dell'utente (2026-08-06, estensione Story 9.33): elenco
// Atlete su tabella a 2 colonne (Nome | Rimuovi) invece dei chip in
// orizzontale. Componente separato da AtletaAssegnata.tsx (non riusato/
// modificato) perche' quel componente e' <li>-based e condiviso con
// MioGruppoCard.tsx (/i-miei-gruppi, fuori scope di questa richiesta) - un
// <tr> dentro il <ul> di quella pagina romperebbe l'HTML. Stesso identico
// contenuto/logica di AtletaAssegnata.tsx, solo la radice cambia (<tr> invece
// di <li>, 2 <td> invece di span/form inline).
export function AtletaTabellaRiga({
  gruppoId,
  gruppoNome,
  atleta,
}: {
  gruppoId: string;
  gruppoNome: string;
  atleta: Atleta;
}) {
  const [state, formAction, pending] = useActionState(rimuoviAtleta, undefined);

  return (
    <tr>
      <td>
        {atleta.nome}
        {/* Story 9.19 (AC #1): informativo, nessun aria-live/role="alert" -
            stesso principio gia' documentato per il badge "scaduto" in
            PresenzeForm.tsx (Story 4.5)/AtletaAssegnata.tsx. */}
        {atleta.certificatoInScadenza && (
          <span className={styles.badge}>Certificato in scadenza</span>
        )}
      </td>
      <td>
        <form
          action={formAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Rimuovere ${atleta.nome} dal Gruppo ${gruppoNome}?`
              )
            ) {
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

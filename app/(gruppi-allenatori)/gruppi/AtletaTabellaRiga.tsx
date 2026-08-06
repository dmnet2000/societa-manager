"use client";

import { useActionState } from "react";
import { rimuoviAtleta } from "./actions";
import type { Atleta } from "./AtletaAssegnata";
import styles from "./gruppi.module.css";

// Richiesta utente 2026-08-06 (estensione Story 9.33): 3 colonne (nome
// completo dell'Atleta, gia' "Cognome Nome" per convenzione pre-esistente
// dell'anagrafica - non l'ordine letterale "Nome Cognome" della richiesta |
// Certificato | Rimuovi) invece delle 2 precedenti (Nome | Rimuovi) - il
// badge certificato, prima dentro la cella Nome, ha ora una colonna propria.
// Scaduto ha priorita' su In scadenza (uno stato certificato e' mutuamente
// esclusivo, ma se mai coesistessero mostrare solo il piu' grave evita due
// badge nella stessa cella). Review fix (Blind Hunter, round 3): il badge
// "Certificato scaduto" usa la stessa variante warning di "in scadenza", non
// danger - regola "non negoziabile" di DESIGN.md (Componenti -> Badge di
// stato), la cui unica eccezione documentata (danger su singola Atleta) e'
// /conferma-certificati (Story 9.23) e non va estesa altrove senza una nuova
// decisione esplicita.
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

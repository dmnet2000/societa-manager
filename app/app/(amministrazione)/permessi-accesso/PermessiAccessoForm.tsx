"use client";

import { useActionState } from "react";
import { salvaPermessiRotte } from "./actions";
import styles from "./permessi-accesso.module.css";

// Stesso elenco/etichette di admin/UtenteRow.tsx, minus ADMIN (AC #2: ADMIN
// e' sempre escluso dai permessi configurabili, accesso pieno hardcoded -
// nessuna colonna/checkbox per quel Ruolo, ne' qui ne' lato Server Action).
const RUOLI_CONFIGURABILI = [
  { value: "ALLENATORE", label: "Allenatore" },
  { value: "ATLETA", label: "Atleta" },
  { value: "GENITORE", label: "Genitore" },
  { value: "SEGRETERIA", label: "Segreteria" },
  { value: "DIRIGENTE", label: "Dirigente" },
] as const;

export type RottaConfigurabile = { prefix: string; navLabel: string };

// AC #3/#4: matrice di checkbox rotta x Ruolo, un unico form (stesso
// principio di PermessiCertificatiForm.tsx: sostituzione completa in una
// transazione, non un diff riga-per-riga). Ogni checkbox codifica la sua
// chiave "rotta|ruolo" nel proprio value - la Server Action ricostruisce le
// righe da salvare a partire dall'insieme delle checkbox spuntate.
export function PermessiAccessoForm({
  rotte,
  abilitati,
}: {
  rotte: RottaConfigurabile[];
  abilitati: string[];
}) {
  const [state, formAction, pending] = useActionState(
    salvaPermessiRotte,
    undefined
  );
  const abilitatiSet = new Set(abilitati);

  return (
    <form action={formAction}>
      <p className={styles.aiuto}>
        Admin ha sempre accesso completo a ogni rotta, non configurabile qui.
        Deseleziona una casella per negare l&apos;accesso a quel Ruolo su
        quella rotta.
      </p>
      {/* Review fix (Blind Hunter + Acceptance Auditor, indipendentemente):
          senza questo avviso il testo sopra fa credere che deselezionare una
          casella revochi subito l'accesso - questa story costruisce solo la
          configurazione, non ancora collegata a route-guard.ts/requireRuolo
          (deferito a Story 12.3). Un Admin che salva credendo di aver gia'
          ristretto un accesso avrebbe un falso senso di sicurezza. */}
      <p className={styles.avviso}>
        Attenzione: questa configurazione non è ancora applicata. I permessi
        di accesso reali restano quelli attuali finché questa funzione non
        sarà collegata al controllo degli accessi (in arrivo).
      </p>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Rotta</th>
              {RUOLI_CONFIGURABILI.map((ruolo) => (
                <th key={ruolo.value}>{ruolo.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rotte.map((rotta) => (
              <tr key={rotta.prefix}>
                <td>
                  {rotta.navLabel}{" "}
                  <span className={styles.prefix}>{rotta.prefix}</span>
                </td>
                {RUOLI_CONFIGURABILI.map((ruolo) => {
                  const chiave = `${rotta.prefix}|${ruolo.value}`;
                  return (
                    <td key={ruolo.value} className={styles.cellaCheckbox}>
                      <input
                        type="checkbox"
                        name="permessi"
                        value={chiave}
                        defaultChecked={abilitatiSet.has(chiave)}
                        aria-label={`${ruolo.label} su ${rotta.navLabel}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Configurazione salvata.
        </p>
      )}
      <button className={styles.bottone} disabled={pending} type="submit">
        Salva
      </button>
    </form>
  );
}

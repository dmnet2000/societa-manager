"use client";

import { useActionState, useEffect, useRef } from "react";
import { assegnaAtleta } from "../gruppi/actions";
import { AtletaAssegnata, type Atleta } from "../gruppi/AtletaAssegnata";
import styles from "./i-miei-gruppi.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
};

// Story 9.15: card per Gruppo invece della riga di tabella di GruppoRow.tsx
// (quella pagina resta ADMIN/DIRIGENTE-only, invariata) - stessa Server
// Action (assegnaAtleta) e stesso componente AtletaAssegnata riusato
// invariato per il pulsante di rimozione.
export function MioGruppoCard({
  gruppo,
  atlete,
  atleteDisponibili,
}: {
  gruppo: Gruppo;
  atlete: Atleta[];
  atleteDisponibili: Atleta[];
}) {
  const [state, formAction, pending] = useActionState(assegnaAtleta, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Stesso pattern di reset gia' usato in GruppoRow.tsx (Story 2.4/9.15).
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className={styles.card}>
      <h2>{gruppo.nome}</h2>
      <p className={styles.categoria}>{gruppo.categoria}</p>
      <ul className={styles.listaAssegnati}>
        {atlete.length === 0 ? (
          <li className={styles.nessunaAtleta}>Nessuna Atleta assegnata.</li>
        ) : (
          atlete.map((atleta) => (
            <AtletaAssegnata
              key={atleta.id}
              gruppoId={gruppo.id}
              gruppoNome={gruppo.nome}
              atleta={atleta}
            />
          ))
        )}
      </ul>
      <form
        ref={formRef}
        action={formAction}
        className={styles.formAssegna}
        onSubmit={(e) => {
          // Review fix (code review Story 9.15): stessa cautela gia' usata
          // per la rimozione (AtletaAssegnata.tsx) - l'assegnazione puo'
          // spostare un'Atleta dal Gruppo di un altro Allenatore (Dev Notes:
          // riassegnazione self-service esplicitamente accettata), senza
          // conferma un misclick nel <select> la sposterebbe in silenzio.
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
    </section>
  );
}

"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  ordinaRigheTabella,
  prossimoOrdinamentoTabella,
  type OrdinamentoTabella,
  type ValoreOrdinamento,
} from "@/lib/ordina-tabella";
import styles from "./tabella-ordinabile.module.css";

export type ColonnaTabella = {
  // Nome della colonna, usato anche nell'aria-label del bottone.
  etichetta: string;
  // Contenuto visibile dell'intestazione se diverso dall'etichetta (es. una
  // sigla in <abbr>); default: l'etichetta.
  contenuto?: ReactNode;
  // Default true: false per le colonne senza un ordine sensato (Azioni,
  // Foto, ...), che restano un'intestazione semplice.
  ordinabile?: boolean;
  className?: string;
};

export type RigaTabella = {
  chiave: string;
  // Un valore per colonna, nello stesso ordine di `colonne` (vedi
  // lib/ordina-tabella.ts per come vengono confrontati).
  valori: ValoreOrdinamento[];
  // Il <tr> completo, renderizzato dalla pagina come prima: classi, celle
  // <th scope="row"> e componenti interattivi restano invariati. La chiave
  // stabile mantiene lo stato locale delle righe quando vengono riordinate.
  riga: ReactNode;
};

// Tabella con intestazioni cliccabili per ordinare le righe, lato client e
// senza richieste al server - usabile anche da una pagina Server Component
// (righe gia' renderizzate passate come prop). Parte nell'ordine originale
// della pagina; ricaricando la pagina si torna a quell'ordine. Stessa
// accessibilita' delle tabelle con ordinamento dedicato (IscrizioniElenco,
// TabellaIncontriCategoria): aria-sort sul th, aria-label con la direzione
// sul bottone, freccia solo decorativa.
export function TabellaOrdinabile({
  colonne,
  righe,
  className,
  didascalia,
  "aria-label": ariaLabel,
}: {
  colonne: ColonnaTabella[];
  righe: RigaTabella[];
  className?: string;
  // Un elemento <caption> completo (con la sua eventuale classe), non solo
  // il testo.
  didascalia?: ReactNode;
  "aria-label"?: string;
}) {
  const [ordinamento, setOrdinamento] = useState<OrdinamentoTabella | null>(null);
  const righeOrdinate = useMemo(
    () => ordinaRigheTabella(righe, ordinamento),
    [righe, ordinamento]
  );

  return (
    <table className={className} aria-label={ariaLabel}>
      {didascalia}
      <thead>
        <tr>
          {colonne.map((colonna, indice) => {
            if (colonna.ordinabile === false) {
              return (
                <th key={indice} scope="col" className={colonna.className}>
                  {colonna.contenuto ?? colonna.etichetta}
                </th>
              );
            }
            const attiva = ordinamento?.colonna === indice;
            const direzione = attiva ? ordinamento.direzione : null;
            const ariaSort = !attiva
              ? "none"
              : direzione === "asc"
                ? "ascending"
                : "descending";
            const ariaLabelBottone = !attiva
              ? `Ordina per ${colonna.etichetta}`
              : direzione === "asc"
                ? `${colonna.etichetta}, ordinato crescente. Ordina decrescente`
                : `${colonna.etichetta}, ordinato decrescente. Ordina crescente`;
            return (
              <th
                key={indice}
                scope="col"
                aria-sort={ariaSort}
                className={[styles.thOrdinabile, colonna.className]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className={styles.bottoneOrdinamento}
                  onClick={() =>
                    setOrdinamento((attuale) => prossimoOrdinamentoTabella(attuale, indice))
                  }
                  aria-label={ariaLabelBottone}
                >
                  {colonna.contenuto ?? colonna.etichetta}
                  <span
                    className={attiva ? styles.frecciaOrdinamento : styles.frecciaInattiva}
                    aria-hidden="true"
                  >
                    {direzione === "desc" ? "▼" : direzione === "asc" ? "▲" : "↕"}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {righeOrdinate.map((riga) => (
          <Fragment key={riga.chiave}>{riga.riga}</Fragment>
        ))}
      </tbody>
    </table>
  );
}

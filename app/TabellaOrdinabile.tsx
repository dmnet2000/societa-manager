"use client";

import { Fragment, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ordinaRigheTabella,
  prossimoOrdinamentoTabella,
  type OrdinamentoTabella,
  type ValoreOrdinamento,
} from "@/lib/ordina-tabella";
import styles from "./tabella-ordinabile.module.css";

// Memoria opzionale dell'ordinamento scelto (prop `memoriaChiave`): salvato in
// localStorage del browser, per utente e per dispositivo. useSyncExternalStore
// evita differenze tra render server e client (lato server vale sempre null).
const EVENTO_MEMORIA = "tabella-ordinabile-memoria";

function leggiMemoria(chiave: string): string | null {
  try {
    return window.localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

function scriviMemoria(chiave: string, valore: OrdinamentoTabella) {
  try {
    window.localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // storage non disponibile: l'ordinamento resta valido solo per questa visita
  }
  window.dispatchEvent(new Event(EVENTO_MEMORIA));
}

function iscrivi(callback: () => void) {
  window.addEventListener(EVENTO_MEMORIA, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO_MEMORIA, callback);
    window.removeEventListener("storage", callback);
  };
}

function analizzaOrdinamento(grezzo: string | null, nColonne: number): OrdinamentoTabella | null {
  if (!grezzo) return null;
  try {
    const v = JSON.parse(grezzo);
    if (
      Number.isInteger(v?.colonna) &&
      v.colonna >= 0 &&
      v.colonna < nColonne &&
      (v.direzione === "asc" || v.direzione === "desc")
    ) {
      return { colonna: v.colonna, direzione: v.direzione };
    }
  } catch {
    // valore corrotto: ignorato
  }
  return null;
}

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
  memoriaChiave,
}: {
  colonne: ColonnaTabella[];
  righe: RigaTabella[];
  className?: string;
  // Un elemento <caption> completo (con la sua eventuale classe), non solo
  // il testo.
  didascalia?: ReactNode;
  "aria-label"?: string;
  // Se presente, l'ordinamento scelto viene ricordato nel browser con questa
  // chiave e ripristinato alla visita successiva.
  memoriaChiave?: string;
}) {
  const grezzo = useSyncExternalStore(
    iscrivi,
    () => (memoriaChiave ? leggiMemoria(memoriaChiave) : null),
    () => null
  );
  const [localeScelto, setLocaleScelto] = useState<OrdinamentoTabella | null>(null);
  const ordinamento = memoriaChiave
    ? analizzaOrdinamento(grezzo, colonne.length)
    : localeScelto;
  const setOrdinamento = (
    aggiorna: (attuale: OrdinamentoTabella | null) => OrdinamentoTabella
  ) => {
    const nuovo = aggiorna(ordinamento);
    if (memoriaChiave) scriviMemoria(memoriaChiave, nuovo);
    else setLocaleScelto(nuovo);
  };
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

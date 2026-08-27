"use client";

import { useMemo, useState } from "react";
import type { Ruolo } from "@prisma/client";
import {
  ordinaUtentiPerRuolo,
  ordinaUtentiPerStato,
} from "@/lib/ordina-utenti-per-ruolo-stato";
import { UtenteRow } from "./UtenteRow";
import styles from "./admin.module.css";

type Utente = {
  id: string;
  email: string;
  attivo: boolean;
  ruoli: Ruolo[];
  emailConfermata: boolean;
};

// Story 9.40: nuovo Client Component, mirror esatto della relazione
// conferma-certificati/page.tsx + ListaConfermati.tsx (Story 9.25) - AdminPage
// resta un Server Component async con accesso diretto a Prisma/Supabase Admin
// API, questo componente riceve l'array gia' shape-ato e gestisce solo
// l'interattivita' di ordinamento client-side (nessun round-trip server).
// Un solo criterio alla volta (Ruolo oppure Stato, mai entrambi insieme) -
// confermato con l'utente in fase di pianificazione.
export function ElencoUtenti({ utenti }: { utenti: Utente[] }) {
  const [criterio, setCriterio] = useState<"ruolo" | "stato" | null>(null);

  const utentiVisualizzati = useMemo(() => {
    if (criterio === "ruolo") return ordinaUtentiPerRuolo(utenti);
    if (criterio === "stato") return ordinaUtentiPerStato(utenti);
    return utenti;
  }, [utenti, criterio]);

  return (
    <>
      <div className={styles.barraOrdinamento}>
        <button
          type="button"
          className={styles.bottoneOrdina}
          aria-pressed={criterio === "ruolo"}
          onClick={() => setCriterio((c) => (c === "ruolo" ? null : "ruolo"))}
        >
          Ruolo
        </button>
        <button
          type="button"
          className={styles.bottoneOrdina}
          aria-pressed={criterio === "stato"}
          onClick={() => setCriterio((c) => (c === "stato" ? null : "stato"))}
        >
          Stato
        </button>
      </div>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Ruoli</th>
              <th>Stato</th>
              <th>Funzioni</th>
              <th>Correggi email</th>
            </tr>
          </thead>
          <tbody>
            {utentiVisualizzati.map((utente) => (
              <UtenteRow
                // Include i Ruoli nella key: forza il remount (e quindi il
                // refresh delle checkbox non controllate) quando cambiano.
                key={`${utente.id}:${utente.ruoli.join(",")}`}
                utente={utente}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useId } from "react";
import styles from "./campo-ricerca-atlete.module.css";

// Campo di ricerca condiviso dalle pagine con un elenco Atlete
// (/app/conferma-iscrizioni, /app/conferma-certificati) - il filtro vero e
// proprio vive in lib/ricerca-atlete.ts, qui solo label + input + esito.
// `esito` gia' composto dal chiamante (conosce righe totali/visibili) e
// mostrato solo mentre e' in corso una ricerca; annunciato con role="status".
export function CampoRicercaAtlete({
  valore,
  onChange,
  esito,
}: {
  valore: string;
  onChange: (valore: string) => void;
  esito: string | null;
}) {
  const id = useId();

  return (
    <div className={styles.ricerca}>
      <label htmlFor={id}>Cerca per cognome, nome o codice fiscale</label>
      <input
        id={id}
        type="search"
        value={valore}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        placeholder="es. Rossi oppure RSSMRA10"
      />
      {esito && (
        <p role="status" className={styles.esito}>
          {esito}
        </p>
      )}
    </div>
  );
}

// Testo dell'esito per il numero di righe visibili su quelle totali.
export function esitoRicercaAtlete(visibili: number, totali: number): string {
  if (visibili === 0) return "Nessuna Atleta trovata.";
  return `${visibili} ${visibili === 1 ? "Atleta trovata" : "Atlete trovate"} su ${totali}.`;
}

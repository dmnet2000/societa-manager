"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

// Story 14.2 (AC #4): nessun app/error.tsx esisteva in tutto il progetto
// prima di questa story - verificato in analisi. Senza un Error Boundary,
// un fallimento di rete durante l'invocazione di una Server Action (es.
// l'utente e' offline) e' un'eccezione non gestita: React smonta l'intero
// albero, l'utente vede una schermata bianca, non un messaggio chiaro -
// esattamente il comportamento che AC #4 vieta. `error.tsx` e' l'unico
// meccanismo Next.js per questo (node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/error.md), quindi copre anche
// qualunque altra eccezione non gestita del sito, non solo le Server
// Action offline.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // Review: nessuna osservabilita' esisteva su questo Error Boundary -
  // stesso pattern console.error gia' in uso altrove nel progetto
  // (NavBar.tsx, middleware.ts).
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <h1>Si è verificato un errore</h1>
      <p className={styles.testo}>
        Verifica la connessione e riprova. Se l&apos;errore persiste,
        contatta la segreteria.
      </p>
      <button
        type="button"
        className={styles.bottone}
        onClick={() => unstable_retry()}
      >
        Riprova
      </button>
    </main>
  );
}

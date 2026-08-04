"use client";

import { useEffect } from "react";

// Story 14.2: registra il Service Worker solo in produzione - farlo anche
// in "next dev" intralcerebbe il ciclo di sviluppo locale con una cache
// stale del proprio codice (pattern comune, non specifico di questo
// progetto). Nessun return visivo: componente invisibile, montato solo
// per l'effetto collaterale della registrazione (AC #2).
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error(err));
    }
  }, []);

  return null;
}

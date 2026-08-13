"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DURATA_COOKIE_CONSENSO_SECONDI,
  NOME_COOKIE_CONSENSO,
  type ValoreConsenso,
} from "@/lib/cookie-consenso";
import styles from "./CookieBanner.module.css";

// Story 18.6: separazione Server/Client per l'interattivita', stesso
// principio gia' stabilito da app/NavBar.tsx (Server) / app/NavBarClient.tsx
// (Client, Story 9.2) - qui pero' il componente e' SEMPRE montato (a
// differenza di mostraSponsor/mostraPartite in app/page.tsx, che nascondono
// del tutto la sezione): serve restare raggiungibile per riaprire le
// preferenze in qualunque momento (AC #3), quindi non puo' sparire
// interamente dall'albero una volta dato il consenso - resta solo come
// piccolo pulsante "Preferenze cookie".
//
// Review fix (code review Story 18.6, Acceptance Auditor): SameSite=Lax
// esplicito - allineato all'unico altro precedente di scrittura cookie nel
// progetto (lib/supabase/server.ts, che lo imposta tramite @supabase/ssr),
// invece di affidarsi al default implicito del browser.
function impostaConsenso(valore: ValoreConsenso) {
  document.cookie = `${NOME_COOKIE_CONSENSO}=${valore}; path=/; max-age=${DURATA_COOKIE_CONSENSO_SECONDI}; SameSite=Lax`;
}

export function CookieBanner({
  valoreIniziale,
}: {
  valoreIniziale: ValoreConsenso | undefined;
}) {
  const router = useRouter();
  const [visibile, setVisibile] = useState(valoreIniziale === undefined);
  // Review fix (code review Story 18.6, Acceptance Auditor): tenuto
  // separato da "visibile" per soddisfare l'AC #3 ("rivedere... la
  // scelta") - riaprendo il banner dal pulsante "Preferenze cookie" si
  // vede quale scelta e' attualmente registrata, non solo un modulo vuoto
  // identico alla prima visita.
  const [valoreCorrente, setValoreCorrente] = useState(valoreIniziale);

  if (!visibile) {
    return (
      <button
        type="button"
        className={styles.preferenze}
        onClick={() => setVisibile(true)}
      >
        Preferenze cookie
      </button>
    );
  }

  // AC #4: nessun overlay/backdrop - il banner e' una fascia fissa in
  // fondo alla pagina, il resto resta interamente utilizzabile, stesso
  // principio "alert non bloccante" (FR-15, EXPERIENCE.md) gia' seguito da
  // ogni avviso di questo prodotto.
  return (
    <div className={styles.banner} role="region" aria-label="Consenso cookie">
      <p className={styles.testo}>
        Questo sito usa cookie tecnici necessari al funzionamento. Con il tuo
        consenso, mostriamo anche contenuti di terze parti (es. post dai
        nostri canali social) che utilizzano cookie non essenziali.
        {valoreCorrente && (
          <>
            {" "}
            Hai attualmente <strong>{valoreCorrente}</strong> i cookie non
            essenziali.
          </>
        )}
      </p>
      <div className={styles.azioni}>
        <button
          type="button"
          className={styles.bottoneSecondario}
          onClick={() => {
            impostaConsenso("rifiutato");
            setValoreCorrente("rifiutato");
            setVisibile(false);
            // Story 18.5: senza questo refresh, app/page.tsx (Server
            // Component force-dynamic che legge il cookie a ogni richiesta)
            // non rigirerebbe finche' non arriva un'altra navigazione - la
            // sezione social (gated sul consenso, AC #4) non
            // apparirebbe/sparirebbe subito dopo la scelta. router.refresh()
            // e' un soft refresh: rifa' girare i Server Component con il
            // nuovo valore del cookie senza un reload completo, senza
            // perdere lo stato client (es. il banner che si e' appena
            // richiuso sopra).
            router.refresh();
          }}
        >
          Rifiuta
        </button>
        <button
          type="button"
          className={styles.bottone}
          onClick={() => {
            impostaConsenso("accettato");
            setValoreCorrente("accettato");
            setVisibile(false);
            router.refresh();
          }}
        >
          Accetta
        </button>
      </div>
    </div>
  );
}

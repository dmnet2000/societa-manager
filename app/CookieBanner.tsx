"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DURATA_COOKIE_CONSENSO_SECONDI,
  NOME_COOKIE_CONSENSO,
  type ValoreConsenso,
} from "@/lib/cookie-consenso";
import styles from "./CookieBanner.module.css";

// Story 18.6: separazione Server/Client per l'interattivita', stesso
// principio gia' stabilito da app/NavBar.tsx (Server) / app/NavBarClient.tsx
// (Client, Story 9.2).
//
// Story 18.17 (secondo giro): il pulsante fisso permanente "Preferenze
// cookie" (sempre visibile in basso a sinistra) e' stato rimosso su
// richiesta dell'utente ("ancora troppo invasivo e visibile") - sostituito
// da un link nel footer condiviso (FooterPubblico.tsx, presente su ogni
// pagina pubblica), che naviga qui con apriPreferenze=true. Il diritto di
// revoca del consenso in qualunque momento (AC #3 originale di Story 18.6,
// Linee guida Garante Privacy) resta soddisfatto - solo il punto di accesso
// e' cambiato, da "sempre visibile in overlay" a "raggiungibile dal
// footer di ogni pagina".
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
  apriPreferenze = false,
}: {
  valoreIniziale: ValoreConsenso | undefined;
  // Story 18.17: true quando si arriva da "/?preferenze-cookie=1" (link nel
  // footer) - forza il banner ad aprirsi indipendentemente dalla scelta
  // gia' registrata.
  apriPreferenze?: boolean;
}) {
  const router = useRouter();
  const [visibile, setVisibile] = useState(
    valoreIniziale === undefined || apriPreferenze
  );
  // Review fix (code review Story 18.6, Acceptance Auditor): tenuto
  // separato da "visibile" per soddisfare l'AC #3 ("rivedere... la
  // scelta") - riaprendo il banner dal link "Preferenze cookie" si vede
  // quale scelta e' attualmente registrata, non solo un modulo vuoto
  // identico alla prima visita.
  const [valoreCorrente, setValoreCorrente] = useState(valoreIniziale);

  // Story 18.17: pulisce il query param dall'URL dopo l'apertura forzata -
  // senza, un refresh o una condivisione del link riaprirebbe il banner
  // all'infinito. Non tocca lo stato "visibile" gia' impostato sopra.
  useEffect(() => {
    if (apriPreferenze) {
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visibile) {
    return null;
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

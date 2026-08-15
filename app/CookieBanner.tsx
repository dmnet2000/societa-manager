"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
// pagina pubblica), che naviga qui verso "/?preferenze-cookie=1". Il
// diritto di revoca del consenso in qualunque momento (AC #3 originale di
// Story 18.6, Linee guida Garante Privacy) resta soddisfatto - solo il
// punto di accesso e' cambiato, da "sempre visibile in overlay" a
// "raggiungibile dal footer di ogni pagina".
//
// Review fix (code review Story 18.17, Acceptance Auditor): il valore va
// letto con useSearchParams() (reattivo), NON passato come prop da
// app/page.tsx e letto una sola volta in un useState initializer - questo
// componente resta montato quando si clicca il link dalla HOME stessa
// (stessa rotta "/", solo il query param cambia), quindi un initializer
// one-shot non si ri-eseguirebbe mai e il banner non si riaprirebbe. Stesso
// pattern esplicitamente documentato nella guida Next.js di questo
// progetto (node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md,
// sezione "Dialog and initialization logic": "derive the dialog state from
// something outside the preserved component state like a search param").
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
  const searchParams = useSearchParams();
  // Presenza, non valore, conta (mirror ?edit=true dell'esempio Next.js
  // sopra, ma qui basta che il param esista - nessun valore atteso).
  const apriPreferenze = searchParams.has("preferenze-cookie");
  const [visibile, setVisibile] = useState(valoreIniziale === undefined);
  // Review fix (code review Story 18.6, Acceptance Auditor): tenuto
  // separato da "visibile" per soddisfare l'AC #3 ("rivedere... la
  // scelta") - riaprendo il banner dal link "Preferenze cookie" si vede
  // quale scelta e' attualmente registrata, non solo un modulo vuoto
  // identico alla prima visita.
  const [valoreCorrente, setValoreCorrente] = useState(valoreIniziale);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Reagisce ad ogni transizione apriPreferenze false->true (non solo al
  // mount) - risolve il bug scoperto in code review: cliccando il link dal
  // footer mentre si e' gia' su "/", nessuna nuova pagina viene montata
  // (stessa rotta), quindi solo un valore derivato in questo modo si
  // aggiorna davvero. "Adjusting state during render" (non un useEffect
  // per il setVisibile: la regola react-hooks/set-state-in-effect vieta
  // esattamente questo, stesso pattern gia' stabilito in NavBarClient.tsx
  // per pathnamePrecedente/apertoPrecedente) - il setState avviene
  // sincrono nel corpo del render, non causa un render "a cascata" in piu'.
  const [apriPreferenzePrecedente, setApriPreferenzePrecedente] =
    useState(apriPreferenze);
  if (apriPreferenze !== apriPreferenzePrecedente) {
    setApriPreferenzePrecedente(apriPreferenze);
    if (apriPreferenze) setVisibile(true);
  }

  // Pulizia dell'URL via history.replaceState (non router.replace): rimuove
  // il solo query param "preferenze-cookie" senza innescare una seconda
  // richiesta RSC completa (che ririchiamerebbe anche l'API Graph di
  // Facebook) e senza cancellare altri eventuali query param futuri. Vera
  // mutazione di un sistema esterno (browser History API), resta
  // legittimamente in un useEffect.
  useEffect(() => {
    if (!apriPreferenze) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("preferenze-cookie");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [apriPreferenze]);

  // Sposta il focus sul banner quando si apre da un'azione esplicita
  // dell'utente (link "Preferenze cookie") - non alla prima visita
  // spontanea (dove nessun gesto ha "aperto" nulla, stesso principio gia'
  // seguito da ogni banner di consenso non invasivo di questo prodotto).
  useEffect(() => {
    if (apriPreferenze && visibile) {
      bannerRef.current?.focus();
    }
  }, [apriPreferenze, visibile]);

  if (!visibile) {
    return null;
  }

  // AC #4: nessun overlay/backdrop - il banner e' una fascia fissa in
  // fondo alla pagina, il resto resta interamente utilizzabile, stesso
  // principio "alert non bloccante" (FR-15, EXPERIENCE.md) gia' seguito da
  // ogni avviso di questo prodotto.
  return (
    <div
      ref={bannerRef}
      tabIndex={-1}
      className={styles.banner}
      role="region"
      aria-label="Consenso cookie"
    >
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

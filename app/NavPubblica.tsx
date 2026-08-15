"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavPubblica.module.css";

// Story 18.7: componente riusabile, montato da ogni pagina pubblica
// (app/page.tsx oggi; app/squadre/page.tsx, app/calendario/page.tsx,
// app/staff/page.tsx, app/contatti/page.tsx quando le Story 18.8-18.11
// esisteranno) - ciascuna ottiene lo stato attivo corretto in modo
// indipendente al proprio caricamento, nessun problema di staleness da
// layout condiviso (a differenza di app/NavBarClient.tsx, montato una sola
// volta nel root layout autenticato).
//
// Elenco voci hard-coded (non derivato da PUBLIC_ROUTES, che e' un array
// di stringhe senza label - lib/auth/route-guard.ts) - "Squadre"/
// "Calendario"/"Staff"/"Contatti" puntano a rotte non ancora esistenti
// finche' le Story 18.8-18.11 non le implementano (atteso, non un difetto
// di questa storia).
const VOCI = [
  { href: "/", label: "Home" },
  { href: "/squadre", label: "Squadre" },
  { href: "/calendario", label: "Calendario" },
  { href: "/staff", label: "Staff" },
  { href: "/contatti", label: "Contatti" },
] as const;

// Story 18.18: hamburger/drawer su mobile (decisione presa con l'utente,
// riapre deliberatamente la scelta "solo wrap" di Story 18.7/18.12). Stesso
// pattern di rilevamento desktop/mobile gia' stabilito da
// app/NavBarClient.tsx (Story 9.2, useSyncExternalStore+matchMedia) -
// riusato in forma ridotta, non l'intera complessita' di quel componente
// (nessun overlay/blocco scroll/reset su pathname: qui basta un pannello
// dropdown con 5 link piatti, e NavPubblica viene gia' rimontato da zero ad
// ogni pagina pubblica - nessun layout condiviso lo mantiene persistente,
// verificato in app/layout.tsx). 901px, non 880px (portale interno): 900px
// e' gia' il breakpoint mobile/desktop di tutto il registro pubblico
// "Poster Sportivo" (home-pubblica/calendario/contatti/squadre/staff
// .module.css).
function sottoscriviMediaQuery(callback: () => void) {
  const mq = window.matchMedia("(min-width: 901px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function leggiDesktop() {
  return window.matchMedia("(min-width: 901px)").matches;
}
function leggiDesktopServer() {
  return false;
}

// usePathname() (non un valore calcolato server-side): app/page.tsx e' un
// Server Component (force-dynamic) e non puo' chiamarlo direttamente -
// stesso principio gia' stabilito da app/NavBarClient.tsx (Story 9.10) per
// il motivo opposto (layout radice che non si ri-esegue), qui riusato per
// poter restare un componente indipendente dalle pagine che lo montano.
// Confronto di uguaglianza esatta (non isVoceAttiva/prefissi di
// NavBarClient.tsx): 5 rotte piatte e mutuamente esclusive, nessuna
// annidata sotto un'altra.
export function NavPubblica() {
  const pathname = usePathname();
  const [aperto, setAperto] = useState(false);
  const desktop = useSyncExternalStore(
    sottoscriviMediaQuery,
    leggiDesktop,
    leggiDesktopServer
  );

  // Esc chiude il pannello - mirror esatto del pattern gia' in
  // NavBarClient.tsx, ascoltatore attivo solo quando aperto.
  useEffect(() => {
    if (!aperto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAperto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aperto]);

  return (
    <>
      <button
        type="button"
        className={styles.hamburger}
        aria-expanded={aperto}
        aria-controls="nav-pubblica-lista"
        aria-label={aperto ? "Chiudi il menu di navigazione" : "Apri il menu di navigazione"}
        onClick={() => setAperto((v) => !v)}
      >
        ☰
      </button>
      <nav aria-label="Sezioni del sito" className={styles.nav}>
        {/* Rendering condizionale (non inert/aria-hidden su un elemento
            sempre montato): mirror dello stesso principio gia' usato per
            .menuProfiloTendina in NavBarClient.tsx - "semplicemente non
            esiste finche' non e' aperto". Piu' semplice dell'approccio
            inert della sidebar principale, che serve solo a preservare una
            transizione CSS di scorrimento assente qui. */}
        {(desktop || aperto) && (
          <ul id="nav-pubblica-lista" className={styles.lista}>
            {VOCI.map((voce) => {
              const attiva = pathname === voce.href;
              return (
                <li key={voce.href}>
                  <Link
                    href={voce.href}
                    className={attiva ? `${styles.voce} ${styles.voceAttiva}` : styles.voce}
                    aria-current={attiva ? "page" : undefined}
                    onClick={() => setAperto(false)}
                  >
                    {voce.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </>
  );
}

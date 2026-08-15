"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
// app/NavBarClient.tsx (Story 9.2, useSyncExternalStore+matchMedia). 901px,
// non 880px (portale interno): 900px e' gia' il breakpoint mobile/desktop
// di tutto il registro pubblico "Poster Sportivo" (home-pubblica/
// calendario/contatti/squadre/staff .module.css).
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
  const navRef = useRef<HTMLElement>(null);

  // Review fix (code review, Edge Case Hunter): true solo su mobile con
  // pannello chiuso - determina se il <ul> va nascosto/inert. Il <ul> resta
  // SEMPRE montato nell'HTML (vedi sotto), non piu' condizionato su
  // "desktop || aperto" - quella scorciatoia (mutuata da .menuProfiloTendina
  // di NavBarClient.tsx) toglieva l'intero menu dall'HTML server-renderizzato
  // per ogni visitatore fino all'idratazione client (leggiDesktopServer()
  // e' sempre false), e per chi non ha JS lo toglieva del tutto - anche su
  // desktop. Mirror corretto: la SIDEBAR di NavBarClient.tsx (non il menu
  // profilo) resta sempre nel DOM e usa inert/aria-hidden proprio per
  // questo motivo, non "per preservare una transizione CSS" (correzione
  // rispetto al commento precedente, che citava male il proprio riferimento).
  const navNascosto = !desktop && !aperto;

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

  // Review fix (code review, Blind Hunter + Edge Case Hunter): tocco fuori
  // dal pannello lo chiude - il gesto di dismissione piu' comune su mobile,
  // mancava del tutto (solo Esc o un link chiudevano). Mirror dello stesso
  // pattern gia' in uso per .menuProfiloRef in NavBarClient.tsx.
  useEffect(() => {
    if (!aperto) return;
    function onPointerDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [aperto]);

  // Review fix (code review, Edge Case Hunter): se la finestra viene
  // ridimensionata oltre il breakpoint desktop mentre aperto=true (rimasto
  // da un'interazione precedente su mobile) e poi di nuovo sotto, il
  // pannello altrimenti riapparirebbe aperto senza alcun click dell'utente.
  // "Adjusting state during render" (non un useEffect: react-hooks/set-state-in-effect
  // lo vieta), stesso pattern gia' stabilito in NavBarClient.tsx.
  const [desktopPrecedente, setDesktopPrecedente] = useState(desktop);
  if (desktop !== desktopPrecedente) {
    setDesktopPrecedente(desktop);
    if (desktop) setAperto(false);
  }

  return (
    // Story 18.18: hamburger dentro <nav> (non piu' un fratello separato in
    // un Fragment) - resta un solo figlio flex di HeaderPubblico .header,
    // invariato rispetto a prima di questa storia (nessun impatto sulla
    // distribuzione flex tra .brand/.accedi).
    <nav aria-label="Sezioni del sito" className={styles.nav} ref={navRef}>
      <button
        type="button"
        className={styles.hamburger}
        aria-expanded={aperto}
        aria-controls="nav-pubblica-lista"
        aria-label={aperto ? "Chiudi il menu di navigazione" : "Apri il menu di navigazione"}
        onClick={() => setAperto((v) => !v)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <ul
        id="nav-pubblica-lista"
        className={aperto ? `${styles.lista} ${styles.listaAperta}` : styles.lista}
        inert={navNascosto}
        aria-hidden={navNascosto}
      >
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
    </nav>
  );
}

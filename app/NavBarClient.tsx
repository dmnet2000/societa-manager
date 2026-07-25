"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { VoceNavigazione } from "@/lib/auth/voci-navigazione";
import styles from "./NavBar.module.css";

// Story 9.2: la parte interattiva (stato aperto/chiuso del drawer mobile) e'
// isolata in questo Client Component - il resto (sessione/Ruoli/logo) resta
// in app/NavBar.tsx (Server Component), invariato. Su desktop (>= 880px,
// vedi NavBar.module.css) questo stato non ha alcun effetto visivo: la
// barra laterale e' sempre visibile via CSS, indipendentemente da `aperto`.
type VoceConStato = VoceNavigazione & { attiva: boolean };

// Review fix (code review Story 9.2): replica qui lo stesso breakpoint
// 880px del CSS (NavBar.module.css) - se quel valore cambia, va cambiato
// anche qui. useSyncExternalStore (non useEffect+setState) e' il pattern
// corretto per sincronizzarsi con un'API del browser come matchMedia -
// chiamare setState direttamente nel corpo di un useEffect e' segnalato
// come anti-pattern da react-hooks/set-state-in-effect (causa un render
// aggiuntivo evitabile). getServerSnapshot ritorna sempre false (il server
// non conosce mai la larghezza reale del viewport) - per una frazione di
// secondo prima dell'idratazione un Utente desktop potrebbe vedere la
// sidebar visivamente corretta (il CSS non dipende da questo stato) ma
// tecnicamente "inert" finche' React non idrata e corregge il valore,
// conseguenza normale/accettata di qualunque sincronizzazione SSR+matchMedia.
function sottoscriviMediaQuery(callback: () => void) {
  const mq = window.matchMedia("(min-width: 880px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function leggiDesktop() {
  return window.matchMedia("(min-width: 880px)").matches;
}
function leggiDesktopServer() {
  return false;
}

export function NavBarClient({
  voci,
  logoUrl,
  titolo,
  esci,
}: {
  voci: VoceConStato[];
  logoUrl: string | null;
  titolo: string;
  esci: () => Promise<void>;
}) {
  const [aperto, setAperto] = useState(false);
  const pathname = usePathname();

  // Review fix (code review Story 9.2, trovato da tutti e 3 i layer): sotto
  // 880px il drawer "chiuso" era nascosto solo visivamente
  // (transform: translateX(-100%) in NavBar.module.css), ma restava
  // raggiungibile da tastiera/screen reader - violava l'AC "le voci sono
  // nascoste finche' non lo apre". Il componente pero' non sa da solo se e'
  // su mobile o desktop (solo il CSS lo sa, via media query) - su desktop
  // il drawer deve restare SEMPRE interattivo, indipendentemente da
  // `aperto` (vedi funzioni sopra per il dettaglio del pattern).
  const desktop = useSyncExternalStore(
    sottoscriviMediaQuery,
    leggiDesktop,
    leggiDesktopServer
  );

  const navNascosto = !desktop && !aperto;

  // Review fix (code review Story 9.2): senza blocco dello scroll, il
  // contenuto della pagina sotto l'overlay restava scorrevole mentre il
  // drawer era aperto su mobile.
  useEffect(() => {
    if (desktop) return;
    document.body.style.overflow = aperto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aperto, desktop]);

  // AC (Story 9.2): il drawer si chiude quando l'Utente seleziona una voce.
  // Pattern "adjusting state during render" (non un useEffect): chiamare
  // setState nel corpo dell'effect causerebbe un render in piu' non
  // necessario (regola react-hooks/set-state-in-effect) - confrontare il
  // pathname direttamente durante il render e' lo stesso pattern
  // raccomandato da React per "resettare uno stato quando cambia un prop/
  // valore derivato". usePathname() cambia ad ogni navigazione completata
  // (client-side o meno), piu' robusto di un onClick su ogni singolo
  // <Link> (copre anche il pulsante "indietro" del browser).
  const [pathnamePrecedente, setPathnamePrecedente] = useState(pathname);
  if (pathname !== pathnamePrecedente) {
    setPathnamePrecedente(pathname);
    setAperto(false);
  }

  // AC (Story 9.2): Esc chiude il drawer. Ascoltatore attivo solo quando
  // aperto, per non intercettare Esc altrove nell'app inutilmente.
  useEffect(() => {
    if (!aperto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAperto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aperto]);

  const brand = (
    <div className={styles.brand}>
      {/* Nessuna immagine rotta se il logo non e' mai stato caricato
          (Story 7.2, stesso guard-clause di app/(configurazione)/logo/page.tsx). */}
      {logoUrl && <img className={styles.logo} src={logoUrl} alt="" />}
      <span className={styles.title}>{titolo}</span>
    </div>
  );

  return (
    <>
      <div className={styles.topBar}>
        {brand}
        <button
          type="button"
          className={styles.hamburger}
          aria-expanded={aperto}
          aria-controls="nav-sidebar"
          aria-label={aperto ? "Chiudi il menu di navigazione" : "Apri il menu di navigazione"}
          onClick={() => setAperto((v) => !v)}
        >
          ☰
        </button>
      </div>
      {/* AC (Story 9.2): tocco fuori dal menu lo chiude - visibile/cliccabile
          solo su mobile quando aperto (nessun effetto su desktop, dove il
          drawer non esiste piu' come overlay). */}
      {aperto && (
        <div
          className={styles.overlay}
          onClick={() => setAperto(false)}
          aria-hidden="true"
        />
      )}
      <nav
        id="nav-sidebar"
        aria-label="Navigazione principale"
        className={aperto ? `${styles.sidebar} ${styles.sidebarAperta}` : styles.sidebar}
        inert={navNascosto}
        aria-hidden={navNascosto}
      >
        <div className={styles.brandSidebar}>{brand}</div>
        <ul className={styles.voci}>
          {voci.map((voce) => (
            <li key={voce.href}>
              <Link
                href={voce.href}
                className={voce.attiva ? `${styles.voce} ${styles.voceAttiva}` : styles.voce}
              >
                {voce.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={esci} className={styles.formEsci}>
          <button type="submit" className={styles.voce}>
            Esci
          </button>
        </form>
      </nav>
    </>
  );
}

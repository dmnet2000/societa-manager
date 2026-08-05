"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isGruppoAttivo,
  isVoceAttiva,
  type VoceNavigazione,
} from "@/lib/auth/voci-navigazione";
import styles from "./NavBar.module.css";

// Story 9.2: la parte interattiva (stato aperto/chiuso del drawer mobile) e'
// isolata in questo Client Component - il resto (sessione/Ruoli/logo) resta
// in app/NavBar.tsx (Server Component), invariato. Su desktop (>= 880px,
// vedi NavBar.module.css) questo stato non ha alcun effetto visivo: la
// barra laterale e' sempre visibile via CSS, indipendentemente da `aperto`.

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

// Story 15.1: trova il primo gruppo (se esiste) con una figlia attiva per
// il pathname dato - usato sia per lo stato iniziale sia per riespandere
// il gruppo giusto quando il pathname cambia (AC #2).
function trovaGruppoAttivo(
  voci: VoceNavigazione[],
  pathname: string
): string | null {
  for (const voce of voci) {
    if (voce.tipo === "gruppo" && isGruppoAttivo(pathname, voce)) {
      return voce.label;
    }
  }
  return null;
}

export function NavBarClient({
  voci,
  logoUrl,
  titolo,
  esci,
  email,
}: {
  voci: VoceNavigazione[];
  logoUrl: string | null;
  titolo: string;
  esci: () => Promise<void>;
  email: string;
}) {
  const [aperto, setAperto] = useState(false);
  // Story 9.4: stato aperto/chiuso del menu profilo (dropdown "email ->
  // Modifica password/Esci"), stesso stile di stato locale del drawer sopra
  // - un secondo useState indipendente, non un'unione con `aperto` (i due
  // pannelli si aprono/chiudono in modo indipendente).
  const [menuProfiloAperto, setMenuProfiloAperto] = useState(false);
  const menuProfiloRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Story 15.1 (AC #1/#2): quali gruppi sono espansi - a differenza di
  // `aperto`/`menuProfiloAperto` (pannelli transitori sovrapposti), un
  // gruppo e' una sezione persistente della lista di navigazione: ogni
  // gruppo si espande/collassa in modo indipendente dagli altri (nessuna
  // esclusione reciproca, decisione presa in fase di creazione story).
  // Stato iniziale: il gruppo con una figlia attiva (se esiste) parte
  // espanso.
  const [gruppiEspansi, setGruppiEspansi] = useState<Set<string>>(() => {
    const gruppoAttivo = trovaGruppoAttivo(voci, pathname);
    return gruppoAttivo ? new Set([gruppoAttivo]) : new Set();
  });

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
    // Story 9.4: stesso motivo del drawer sopra - senza questo, il menu
    // profilo resterebbe "aperto" nello stato React dopo aver navigato a
    // /modifica-password (il componente non si smonta mai, e' nel root
    // layout), riapparendo visivamente sulla pagina di destinazione.
    setMenuProfiloAperto(false);
    // Story 15.1 (AC #2): se la nuova pagina e' la figlia di un gruppo non
    // ancora espanso, lo espande - senza toccare lo stato degli altri
    // gruppi (nessuna sorpresa navigando direttamente a un URL figlio, ma
    // anche nessuna collassata inattesa di un gruppo che l'utente aveva
    // aperto manualmente).
    const gruppoAttivo = trovaGruppoAttivo(voci, pathname);
    if (gruppoAttivo && !gruppiEspansi.has(gruppoAttivo)) {
      setGruppiEspansi(new Set(gruppiEspansi).add(gruppoAttivo));
    }
  }

  // Review fix (code review Story 9.4, Edge Case Hunter): stesso pattern
  // "adjusting state during render" di sopra, non un useEffect - senza
  // questo, chiudere il drawer mobile (hamburger o overlay) lasciando il
  // menu profilo aperto lo faceva riapparire gia' espanso alla riapertura
  // successiva del drawer (lo stato React del menu profilo non veniva mai
  // resettato dalla sola chiusura del drawer, solo dal cambio pathname
  // sopra o da Esc/click-fuori sul menu stesso).
  const [apertoPrecedente, setApertoPrecedente] = useState(aperto);
  if (aperto !== apertoPrecedente) {
    setApertoPrecedente(aperto);
    if (!aperto) setMenuProfiloAperto(false);
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

  // AC Story 9.4: Esc chiude il menu profilo - stesso identico pattern
  // dell'effect gemello sopra (drawer), ascoltatore attivo solo quando
  // aperto.
  useEffect(() => {
    if (!menuProfiloAperto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuProfiloAperto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuProfiloAperto]);

  // AC Story 9.4: click fuori dal menu profilo lo chiude. A differenza del
  // drawer (che ha un overlay dedicato a piena pagina su cui intercettare il
  // click), il menu profilo e' un dropdown ancorato senza overlay proprio -
  // serve quindi un ref sul contenitore (trigger + tendina) per distinguere
  // un click al suo interno (incluso il trigger stesso, che gia' gestisce il
  // toggle nel proprio onClick) da un click altrove nella pagina.
  useEffect(() => {
    if (!menuProfiloAperto) return;
    function onPointerDown(e: MouseEvent) {
      if (
        menuProfiloRef.current &&
        !menuProfiloRef.current.contains(e.target as Node)
      ) {
        setMenuProfiloAperto(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuProfiloAperto]);

  const brand = (
    <div className={styles.brand}>
      {/* Nessuna immagine rotta se il logo non e' mai stato caricato
          (Story 7.2, stesso guard-clause di app/(configurazione)/logo/page.tsx). */}
      {logoUrl && <img className={styles.logo} src={logoUrl} alt="" />}
      <span className={styles.title}>{titolo}</span>
    </div>
  );

  // Story 15.1: toggle indipendente per gruppo - click sulla voce padre
  // espande/collassa solo quel gruppo, gli altri restano invariati.
  function toggleGruppo(label: string) {
    setGruppiEspansi((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

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
          {voci.map((voce) => {
            // Story 15.1: caso gruppo - bottone espandibile + figlie
            // renderizzate solo quando espanso (stesso principio gia'
            // scelto per la tendina del menu profilo sotto: "semplicemente
            // non esiste finche' non e' aperto", nessuna transizione CSS
            // che richieda di restarci montato). Nessun aria-controls sul
            // bottone per lo stesso motivo (l'elemento controllato non
            // esiste sempre nel DOM) - stessa scelta gia' fatta per il
            // trigger del menu profilo sotto (aria-haspopup+aria-expanded,
            // niente aria-controls), a differenza dell'hamburger sopra
            // (che invece punta a "nav-sidebar", sempre presente nel DOM).
            if (voce.tipo === "gruppo") {
              const espanso = gruppiEspansi.has(voce.label);
              const gruppoAttivo = isGruppoAttivo(pathname, voce);
              return (
                <li key={voce.label}>
                  <button
                    type="button"
                    className={
                      gruppoAttivo
                        ? `${styles.voceGruppo} ${styles.voceAttiva}`
                        : styles.voceGruppo
                    }
                    aria-expanded={espanso}
                    onClick={() => toggleGruppo(voce.label)}
                  >
                    <span>{voce.label}</span>
                    <span className={styles.chevron} aria-hidden="true">
                      {espanso ? "▾" : "▸"}
                    </span>
                  </button>
                  {espanso && (
                    <ul className={styles.figlie}>
                      {voce.figlie.map((figlia) => {
                        const figliaAttiva = isVoceAttiva(pathname, figlia.href);
                        return (
                          <li key={figlia.href}>
                            <Link
                              href={figlia.href}
                              className={
                                figliaAttiva
                                  ? `${styles.voceFiglia} ${styles.voceAttiva}`
                                  : styles.voceFiglia
                              }
                              aria-current={figliaAttiva ? "page" : undefined}
                            >
                              {figlia.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Story 9.10: calcolato qui invece che ricevuto gia' pronto dal
            // server - pathname (sopra) si aggiorna ad ogni navigazione
            // completata, a differenza del layout radice server-side che
            // resta nella Client Cache e non si ri-esegue.
            const attiva = isVoceAttiva(pathname, voce.href);
            return (
              <li key={voce.href}>
                <Link
                  href={voce.href}
                  className={attiva ? `${styles.voce} ${styles.voceAttiva}` : styles.voce}
                  aria-current={attiva ? "page" : undefined}
                >
                  {voce.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Story 9.4: menu profilo a tendina - sostituisce il singolo
            pulsante "Esci". Trigger = email dell'Utente (nessuna nuova
            icona), stesso ancoraggio "in fondo alla colonna" di prima
            (.menuProfilo riusa margin-top:auto di .formEsci). Dropdown
            ancorato (non un vero modale, vedi Design Notes) - resta
            all'interno dello stesso <nav id="nav-sidebar"> condiviso da
            drawer mobile e barra laterale desktop, nessuna duplicazione di
            markup fra breakpoint. */}
        {/* Review fix (code review Story 9.4, Edge Case Hunter): onBlur con
            currentTarget.contains(relatedTarget) copre l'uscita da tastiera
            (Tab fuori dal menu senza click ne' Esc) - il click-fuori sopra
            (mousedown su menuProfiloRef) non intercetta questo caso, solo i
            click reali. relatedTarget puo' essere null (nessun elemento
            riceve il focus, es. si clicca fuori dalla finestra) - contains
            su null e' sempre false, quindi chiude comunque correttamente. */}
        <div
          className={styles.menuProfilo}
          ref={menuProfiloRef}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setMenuProfiloAperto(false);
            }
          }}
        >
          <button
            type="button"
            className={styles.menuProfiloTrigger}
            aria-haspopup="menu"
            aria-expanded={menuProfiloAperto}
            onClick={() => setMenuProfiloAperto((v) => !v)}
          >
            {email}
          </button>
          {/* Non renderizzato nel DOM quando chiuso (stesso principio gia'
              usato sopra per l'overlay del drawer) - a differenza del
              drawer, questo pannello non ha una transizione CSS che
              richieda di restare montato, quindi non serve alcun
              inert/aria-hidden per bloccarne la raggiungibilita' da
              tastiera: semplicemente non esiste finche' non e' aperto. */}
          {menuProfiloAperto && (
            <div className={styles.menuProfiloTendina} role="menu">
              <Link
                href="/modifica-password"
                role="menuitem"
                className={styles.voceMenu}
              >
                Modifica password
              </Link>
              <form action={esci}>
                <button type="submit" role="menuitem" className={styles.voceMenu}>
                  Esci
                </button>
              </form>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

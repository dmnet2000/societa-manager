"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ContenutoGuida } from "@/lib/guida/contenuti";
import styles from "./aiuto-contestuale.module.css";

// Story 17.1 (AC #3/#4): icona "?" riusabile, posizionata vicino al <h1>
// della pagina che la usa (come fratello, non figlio - un <h1> con questo
// componente annidato dentro inquinerebbe il nome accessibile del titolo
// per uno screen reader, review fix). `contenuto` gia' risolto server-side
// (contenutoPerRotta) - se null (nessun contenuto guida per questa rotta
// per il Ruolo dell'Utente), il componente non renderizza nulla, nessun
// placeholder rotto.
export function AiutoContestuale({ contenuto }: { contenuto: ContenutoGuida | null }) {
  const [aperto, setAperto] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const idPannello = useId();

  // Review fix (2026-08-10, Blind Hunter + Edge Case Hunter, trovato
  // indipendentemente da entrambi): mirror esatto del pattern gia'
  // stabilito in NavBarClient.tsx (menu profilo) - due effetti separati
  // (Escape, click esterno), entrambi attivi solo mentre il pannello e'
  // aperto, entrambi rimossi al cleanup. Prima non c'era alcun modo di
  // chiudere il pannello cliccando fuori.
  useEffect(() => {
    if (!aperto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAperto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [aperto]);

  if (!contenuto) return null;

  return (
    <span ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.pulsante}
        onClick={() => setAperto((a) => !a)}
        aria-expanded={aperto}
        aria-controls={idPannello}
        aria-label={`Aiuto: ${contenuto.titolo}`}
      >
        ?
      </button>
      {aperto && (
        // Review fix (Blind Hunter): non e' un dialog modale (nessun
        // aria-modal, nessun focus-trap/spostamento del focus) - nessun
        // role esplicito invece di "role=dialog", che avrebbe promesso
        // un'interazione mai implementata.
        <div id={idPannello} className={styles.pannello}>
          <p className={styles.titoloPannello}>{contenuto.titolo}</p>
          {contenuto.corpo.map((paragrafo, i) => (
            <p key={i}>{paragrafo}</p>
          ))}
        </div>
      )}
    </span>
  );
}

// Story 17.2: wrapper condiviso <h1> + AiutoContestuale - estratto qui
// invece di ripetere la stessa regola CSS ".intestazionePagina" in ogni
// CSS module di pagina (era gia' successo due volte in Story 17.1,
// sponsor.module.css/palestre.module.css, prima di questo refactor).
// L'icona resta fratello del <h1>, non figlio (stesso motivo del review
// fix sopra: un <h1> con l'icona annidata dentro inquinerebbe il nome
// accessibile del titolo per uno screen reader).
export function TitoloPagina({
  titolo,
  contenuto,
}: {
  titolo: string;
  contenuto: ContenutoGuida | null;
}) {
  return (
    <div className={styles.intestazionePagina}>
      <h1>{titolo}</h1>
      <AiutoContestuale contenuto={contenuto} />
    </div>
  );
}

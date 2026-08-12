"use client";

import { useState } from "react";
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
function impostaConsenso(valore: ValoreConsenso) {
  document.cookie = `${NOME_COOKIE_CONSENSO}=${valore}; path=/; max-age=${DURATA_COOKIE_CONSENSO_SECONDI}`;
}

export function CookieBanner({ mostraSubito }: { mostraSubito: boolean }) {
  const [visibile, setVisibile] = useState(mostraSubito);

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
        consenso, potremo in futuro mostrare anche contenuti di terze parti
        (es. post dai nostri canali social) che utilizzano cookie non
        essenziali.
      </p>
      <div className={styles.azioni}>
        <button
          type="button"
          className={styles.bottoneSecondario}
          onClick={() => {
            impostaConsenso("rifiutato");
            setVisibile(false);
          }}
        >
          Rifiuta
        </button>
        <button
          type="button"
          className={styles.bottone}
          onClick={() => {
            impostaConsenso("accettato");
            setVisibile(false);
          }}
        >
          Accetta
        </button>
      </div>
    </div>
  );
}

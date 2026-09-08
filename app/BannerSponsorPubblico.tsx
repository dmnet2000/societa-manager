"use client";

import { useEffect, useState } from "react";
import { avanti, indietro, indiceEntroLimiti } from "@/lib/carosello-indice";
import styles from "./BannerSponsorPubblico.module.css";

type Banner = {
  id: string;
  nome: string;
  linkEsterno: string | null;
  immagineUrl: string;
};

const INTERVALLO_MS = 5000;

// Story 16.4: mirror strutturale di app/app/SponsorCarosello.tsx (Story
// 16.3) - stesso useState/useEffect per l'avanzamento automatico, stesse
// frecce, stesso riuso di lib/carosello-indice.ts. Due differenze
// deliberate (spec-16-4 Boundaries): indice iniziale casuale invece di 0
// (mai riaperto qui - questo e' un piede di pagina fisso sempre visibile
// su ogni pagina pubblica, non un carosello che l'Utente apre di volta in
// volta) e markup/stile per una striscia fissa a piena larghezza invece di
// una card inline. Montato una sola volta dentro FooterPubblico.tsx (gia'
// presente su tutte le pagine pubbliche).
// Richiesta esplicita dell'utente (story successiva a spec-16-4): rimossi
// il pulsante di pausa/ripresa e i pallini indicatori, mai reintrodotti in
// una revisione successiva senza una nuova richiesta esplicita - l'utente
// e' stato avvisato che questo toglie l'unico modo per l'Utente pubblico
// di fermare la rotazione automatica ogni 5s (WCAG 2.2.2 "Pause, Stop,
// Hide", rispettato dal pulsante pausa rimosso qui e ancora rispettato dal
// carosello interno gemello, SponsorCarosello.tsx, invariato) e ha scelto
// consapevolmente di procedere comunque. Le frecce precedente/successivo
// restano, unico controllo manuale rimasto.
export function BannerSponsorPubblico({ banner }: { banner: Banner[] }) {
  // Review fix (3-layer review, Blind Hunter + Edge Case Hunter, trovato
  // indipendentemente da entrambi): un lazy initializer di useState gira
  // ANCHE durante il render server-side di questo componente Client
  // (Next.js renderizza comunque "use client" lato server per l'HTML
  // iniziale) - Math.random() li' e ancora una seconda volta lato client in
  // fase di hydration producono due indici diversi, causando un hydration
  // mismatch (React text/attribute mismatch, "flash" dello sponsor
  // sbagliato). Fix: stato iniziale deterministico (0, identico
  // server/client), la randomizzazione vera avviene sotto in un useEffect
  // (mai eseguito lato server, solo dopo il mount client) - stesso pattern
  // raccomandato da React per ogni valore che deve differire dall'HTML
  // renderizzato dal server.
  const [indice, setIndice] = useState(0);

  // Review fix: indice iniziale casuale (spec-16-4) applicato qui, non nel
  // lazy initializer sopra - questo effetto gira SOLO lato client dopo il
  // primo mount (mai durante l'SSR), nessun hydration mismatch possibile.
  // Dipendenza vuota deliberata: un solo sorteggio per montaggio pagina,
  // mai ripetuto a ogni cambio di `banner` (che risorteggerebbe l'indice
  // ogni volta che, ad es., un altro Sponsor viene disattivato altrove).
  // Eccezione deliberata a react-hooks/set-state-in-effect (mai disattivata
  // altrove in questo progetto, che risolve sempre il caso "adjust state
  // during render" invece - vedi CookieBanner.tsx/NavBarClient.tsx): quel
  // pattern richiede un valore precedente da confrontare a render-time, qui
  // invece Math.random() e' per definizione un valore impuro non derivabile
  // da alcun prop/stato - esattamente il caso che gli stessi React docs
  // indicano come legittimo per un useEffect (sincronizzare con una
  // sorgente esterna al primo mount), non l'anti-pattern "stato derivabile"
  // che la regola vuole prevenire.
  useEffect(() => {
    if (banner.length > 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndice(Math.floor(Math.random() * banner.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror esatto dell'effetto del carosello interno: nessun intervallo con
  // 0-1 elementi; dipende anche da `indice` cosi' una navigazione manuale
  // (frecce) riavvia il conteggio dei 5s. Nessun controllo di pausa qui
  // (rimosso su richiesta esplicita dell'utente, vedi commento in testa al
  // file) - l'intervallo gira sempre finche' banner.length > 1.
  useEffect(() => {
    if (banner.length <= 1) return;
    const id = setInterval(() => {
      setIndice((i) => avanti(i, banner.length));
    }, INTERVALLO_MS);
    return () => clearInterval(id);
  }, [banner.length, indice]);

  // Nessun banner (nessuna riserva di spazio) se zero Sponsor Banner attivi
  // - FooterPubblico.tsx decide gia' lato server se montare questo
  // componente in base alla stessa condizione; questo return null resta
  // comunque come difesa in profondita' (mirror del return null del
  // carosello interno), mai un markup orfano.
  if (banner.length === 0) return null;

  // Stesso clamp del carosello interno: `indice` puo' restare "stale" oltre
  // la nuova lunghezza se `banner` si riduce tra un render e l'altro.
  const indiceValido = indiceEntroLimiti(indice, banner.length);
  const attuale = banner[indiceValido];
  const immagine = (
    // eslint-disable-next-line @next/next/no-img-element -- URL pubblico Supabase Storage, stesso pattern gia' accettato in SponsorCarosello.tsx
    <img
      src={attuale.immagineUrl}
      alt={`Sponsor ${attuale.nome} (${indiceValido + 1} di ${banner.length})`}
      className={styles.immagine}
    />
  );

  return (
    // role="region" + stesso aria-label del carosello interno (Story 16.3)
    // per coerenza semantica tra i due punti in cui compare lo stesso
    // contenuto (Sponsor Banner in evidenza). Nessun pulsante di
    // chiusura/dismiss (spec-16-4 Never): resta sempre visibile.
    <div className={styles.banner} role="region" aria-label="Sponsor in evidenza">
      <div className={styles.riga}>
        {banner.length > 1 && (
          <button
            type="button"
            className={styles.freccia}
            onClick={() => setIndice((i) => indietro(i, banner.length))}
            aria-label="Sponsor precedente"
          >
            ‹
          </button>
        )}
        {attuale.linkEsterno ? (
          <a
            href={attuale.linkEsterno}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkImmagine}
            aria-label={`Vai al sito di ${attuale.nome}`}
          >
            {immagine}
          </a>
        ) : (
          immagine
        )}
        <p className={styles.nome}>{attuale.nome}</p>
        {banner.length > 1 && (
          <button
            type="button"
            className={styles.freccia}
            onClick={() => setIndice((i) => avanti(i, banner.length))}
            aria-label="Sponsor successivo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

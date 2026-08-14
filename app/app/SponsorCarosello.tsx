"use client";

import { useEffect, useState } from "react";
import { avanti, indietro, indiceEntroLimiti } from "@/lib/carosello-indice";
import styles from "./sponsor-carosello.module.css";

type Banner = {
  id: string;
  nome: string;
  linkEsterno: string | null;
  immagineUrl: string;
};

const INTERVALLO_MS = 5000;

// Story 16.3 (AC #1/#2/#3): primo carosello auto-avanzante del progetto -
// nessun precedente diretto (gli altri useEffect esistenti gestiscono solo
// il reset di un form al successo). I dati sono gia' risolti server-side
// (page.tsx) - nessun fetch client-side.
export function SponsorCarosello({ banner }: { banner: Banner[] }) {
  const [indice, setIndice] = useState(0);
  // Review fix (Blind Hunter): nessun controllo di pausa/stop violava WCAG
  // 2.2.2 (Pause, Stop, Hide) per contenuto che si aggiorna automaticamente
  // per piu' di 5 secondi - primo componente auto-play del progetto, nessuna
  // eccezione documentata da poter invocare.
  const [inPausa, setInPausa] = useState(false);

  // AC #2: avanzamento automatico ogni 5s - nessun intervallo con 0-1
  // elementi (nessun senso a far scorrere un carosello che non cambia mai),
  // ne' mentre l'Utente ha messo in pausa. Review fix (Blind Hunter + Edge
  // Case Hunter, trovato indipendentemente da entrambi): dipende anche da
  // `indice`, cosi' una navigazione manuale (freccia/pallino) riavvia il
  // conteggio dei 5s invece di essere "risucchiata" in avanti poco dopo.
  useEffect(() => {
    if (banner.length <= 1 || inPausa) return;
    const id = setInterval(() => {
      setIndice((i) => avanti(i, banner.length));
    }, INTERVALLO_MS);
    return () => clearInterval(id);
  }, [banner.length, indice, inPausa]);

  // AC #4: nessuna sezione se non ci sono Banner attivi.
  if (banner.length === 0) return null;

  // Review fix (Blind Hunter + Edge Case Hunter, trovato indipendentemente
  // da entrambi): `indice` e' uno stato del componente che puo' restare
  // "stale" oltre la nuova lunghezza se `banner` si riduce tra un render e
  // l'altro (es. un Admin disattiva uno Sponsor mentre la home e' gia'
  // montata) - senza il clamp, banner[indice] sarebbe undefined e
  // attuale.nome/attuale.linkEsterno lancerebbe.
  const indiceValido = indiceEntroLimiti(indice, banner.length);
  const attuale = banner[indiceValido];
  const immagine = (
    // eslint-disable-next-line @next/next/no-img-element -- URL pubblico Supabase Storage, stesso pattern gia' accettato in SponsorVetrinaCard.tsx
    <img
      src={attuale.immagineUrl}
      // Review fix (Blind Hunter): posizione esplicita nell'alt text, stesso
      // contesto gia' presente sui pallini (aria-label "N di totale") - senza,
      // uno screen reader su questo controllo aveva meno informazioni dei pallini.
      alt={`Sponsor ${attuale.nome} (${indiceValido + 1} di ${banner.length})`}
      className={styles.immagine}
    />
  );

  return (
    <section className={styles.carosello} aria-label="Sponsor in evidenza">
      <div className={styles.viewport}>
        {banner.length > 1 && (
          <button
            type="button"
            className={`${styles.freccia} ${styles.frecciaSinistra}`}
            onClick={() => setIndice((i) => indietro(i, banner.length))}
            aria-label="Sponsor precedente"
          >
            ‹
          </button>
        )}
        {/* AC #3: immagine cliccabile verso linkEsterno se impostato - mirror
            esatto di SponsorVetrinaCard.tsx (Story 16.2, estensione post-review). */}
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
        {banner.length > 1 && (
          <button
            type="button"
            className={`${styles.freccia} ${styles.frecciaDestra}`}
            onClick={() => setIndice((i) => avanti(i, banner.length))}
            aria-label="Sponsor successivo"
          >
            ›
          </button>
        )}
      </div>
      <p className={styles.nome}>{attuale.nome}</p>
      {banner.length > 1 && (
        <div className={styles.controlli}>
          <div className={styles.indicatori}>
            {banner.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={
                  i === indiceValido ? `${styles.pallino} ${styles.pallinoAttivo}` : styles.pallino
                }
                onClick={() => setIndice(i)}
                aria-label={`Vai allo sponsor ${i + 1} di ${banner.length}`}
                aria-current={i === indiceValido}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.pausa}
            onClick={() => setInPausa((p) => !p)}
            aria-pressed={inPausa}
            aria-label={inPausa ? "Riprendi lo scorrimento automatico" : "Metti in pausa lo scorrimento automatico"}
          >
            {inPausa ? "▶" : "❚❚"}
          </button>
        </div>
      )}
    </section>
  );
}

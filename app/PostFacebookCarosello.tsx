"use client";

import { useEffect, useState } from "react";
import { avanti, indietro, indiceEntroLimiti } from "@/lib/carosello-indice";
import type { PostFacebook } from "@/lib/facebook-graph";
import styles from "./post-facebook-carosello.module.css";

const INTERVALLO_MS = 10000;

// Formattatore locale dedicato: post.dataPubblicazione e' un ISO 8601
// completo con ora/fuso (formato Graph API, es. "2026-08-10T10:00:00+0000"),
// diverso dalle date-piatte "YYYY-MM-DD" che formattaData (app/page.tsx/
// app/calendario/page.tsx) sa gestire - non riusabile qui, vedi Dev Notes.
function formattaData(iso: string): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Story 18.13: mirror strutturale di app/app/SponsorCarosello.tsx (Story
// 16.3) - stesso principio pausa/ripresa (WCAG 2.2.2), stesse frecce/
// indicatori, stesso clamp indiceEntroLimiti per un elenco che puo' ridursi
// tra un render e l'altro. Differenze: INTERVALLO_MS 10s (non 5s, AC #2),
// nessun link sull'immagine (il link "Vedi su Facebook" e' un elemento
// testuale separato, non l'intero post e' cliccabile), rispetta
// prefers-reduced-motion fin da subito (gap noto ma non corretto in
// SponsorCarosello, vedi Dev Notes della storia). Radice <div>, non
// <section> come SponsorCarosello: sulla home pubblica ogni blocco di
// contenuto e' gia' un singolo <section aria-labelledby>/<h2> (Sponsor/
// Partite/Foto squadra, Story 18.2/18.3/18.4) - il chiamante (app/page.tsx,
// Task 9) fornisce quel <section>/<h2>, annidarne un secondo qui
// duplicherebbe il landmark ARIA senza motivo.
export function PostFacebookCarosello({ post }: { post: PostFacebook[] }) {
  const [indice, setIndice] = useState(0);
  const [inPausa, setInPausa] = useState(false);

  useEffect(() => {
    if (post.length <= 1 || inPausa) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndice((i) => avanti(i, post.length));
    }, INTERVALLO_MS);
    return () => clearInterval(id);
  }, [post.length, indice, inPausa]);

  // AC #3: nessuna sezione se non ci sono post (token assente/non valido,
  // chiamata fallita, o nessun post con testo) - leggiUltimiPostFacebook ha
  // gia' fatto tutto il fail-soft a monte, qui basta la lunghezza.
  if (post.length === 0) return null;

  const indiceValido = indiceEntroLimiti(indice, post.length);
  const attuale = post[indiceValido];

  return (
    <div className={styles.carosello}>
      <div className={styles.viewport}>
        {post.length > 1 && (
          <button
            type="button"
            className={`${styles.freccia} ${styles.frecciaSinistra}`}
            onClick={() => setIndice((i) => indietro(i, post.length))}
            aria-label="Post precedente"
          >
            ‹
          </button>
        )}
        <div className={styles.contenuto}>
          {attuale.immagineUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL esterno ospitato su CDN Facebook, non ottimizzabile da next/image
            <img
              src={attuale.immagineUrl}
              alt="Immagine allegata al post"
              referrerPolicy="no-referrer"
              className={styles.immagine}
            />
          )}
          {/* AC #1: testo completo, mai troncato - nessun line-clamp/overflow
              nascosto in CSS. */}
          <p className={styles.testo}>{attuale.messaggio}</p>
          <div className={styles.meta}>
            {attuale.dataPubblicazione && (
              <span>{formattaData(attuale.dataPubblicazione)}</span>
            )}
            {attuale.permalink && (
              <a
                href={attuale.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Vedi su Facebook
              </a>
            )}
          </div>
        </div>
        {post.length > 1 && (
          <button
            type="button"
            className={`${styles.freccia} ${styles.frecciaDestra}`}
            onClick={() => setIndice((i) => avanti(i, post.length))}
            aria-label="Post successivo"
          >
            ›
          </button>
        )}
      </div>
      {post.length > 1 && (
        <div className={styles.controlli}>
          <div className={styles.indicatori}>
            {post.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={
                  i === indiceValido ? `${styles.pallino} ${styles.pallinoAttivo}` : styles.pallino
                }
                onClick={() => setIndice(i)}
                aria-label={`Vai al post ${i + 1} di ${post.length}`}
                aria-current={i === indiceValido}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.pausa}
            onClick={() => setInPausa((p) => !p)}
            aria-pressed={inPausa}
            aria-label={
              inPausa
                ? "Riprendi lo scorrimento automatico"
                : "Metti in pausa lo scorrimento automatico"
            }
          >
            {inPausa ? "▶" : "❚❚"}
          </button>
        </div>
      )}
    </div>
  );
}

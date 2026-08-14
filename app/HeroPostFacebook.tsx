"use client";

import { useEffect, useState } from "react";
import { avanti, indietro, indiceEntroLimiti } from "@/lib/carosello-indice";
import type { PostFacebook } from "@/lib/facebook-graph";
import styles from "./home-pubblica.module.css";

const INTERVALLO_MS = 10000;

// Richiesta esplicita dell'utente (2026-08-14): il carosello Post Facebook
// (Story 18.13, prima una sezione a se' a fondo pagina) diventa lo sfondo
// fotografico dell'hero, con titolo/CTA sovrapposti sopra e testo/controlli
// del post sotto di loro. Mirror del principio pausa/ripresa (WCAG 2.2.2)
// e del clamp indiceEntroLimiti gia' stabiliti nel progetto (Story 16.3/18.13).
//
// Radice <> con due elementi (sfondo fotografico + fascia info) invece di
// un singolo contenitore: devono comparire in due punti diversi del layout
// dell'hero (il primo assoluto a tutta altezza, il secondo in coda al
// gruppo titolo+CTA) ma condividere lo stesso indice/stato di pausa - un
// solo componente stateful che emette entrambi i pezzi evita che
// desincronizzino (es. sfondo che mostra un post diverso dal testo).
export function HeroPostFacebook({ post }: { post: PostFacebook[] }) {
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

  if (post.length === 0) return null;

  const indiceValido = indiceEntroLimiti(indice, post.length);
  const attuale = post[indiceValido];

  return (
    <>
      <div
        className={styles.heroFotoPost}
        style={
          attuale.immagineUrl ? { backgroundImage: `url(${attuale.immagineUrl})` } : undefined
        }
        aria-hidden="true"
      />
      <div className={styles.infoPost}>
        <p className={styles.testoPost}>{attuale.messaggio}</p>
        <div className={styles.metaPost}>
          {attuale.permalink && (
            <a
              href={attuale.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkPost}
            >
              Vedi su Facebook
            </a>
          )}
        </div>
        {post.length > 1 && (
          <div className={styles.controlliPost}>
            <button
              type="button"
              className={styles.frecciaPost}
              onClick={() => setIndice((i) => indietro(i, post.length))}
              aria-label="Post precedente"
            >
              ‹
            </button>
            <div className={styles.indicatoriPost}>
              {post.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    i === indiceValido
                      ? `${styles.pallinoPost} ${styles.pallinoPostAttivo}`
                      : styles.pallinoPost
                  }
                  onClick={() => setIndice(i)}
                  aria-label={`Vai al post ${i + 1} di ${post.length}`}
                  aria-current={i === indiceValido}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.pausaPost}
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
            <button
              type="button"
              className={styles.frecciaPost}
              onClick={() => setIndice((i) => avanti(i, post.length))}
              aria-label="Post successivo"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </>
  );
}

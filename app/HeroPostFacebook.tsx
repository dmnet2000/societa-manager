"use client";

import { useEffect, useState } from "react";
import { avanti, indietro, indiceEntroLimiti } from "@/lib/carosello-indice";
import type { PostFacebook } from "@/lib/facebook-graph";
import styles from "./home-pubblica.module.css";

const INTERVALLO_MS = 10000;

// Richiesta esplicita dell'utente (2026-08-14): il carosello Post Facebook
// (Story 18.13, prima una sezione a se' a fondo pagina) diventa lo sfondo
// fotografico dell'hero. Mirror del principio pausa/ripresa (WCAG 2.2.2)
// e del clamp indiceEntroLimiti gia' stabiliti nel progetto (Story 16.3/18.13).
//
// Review fix (code review Story 18.19, Blind Hunter): commento aggiornato -
// non descrive piu' "titolo/CTA sovrapposti sopra" ne' "in coda al gruppo
// titolo+CTA" (entrambi rimossi dal secondo giro di Story 18.19). Il blocco
// e' ora un contenitore a se' stante (.heroBlocco, home-pubblica.module.css),
// nessun titolo/CTA nell'hero.
//
// Radice <> con due elementi (sfondo fotografico + fascia info) invece di
// un singolo contenitore: devono comparire in due punti diversi del layout
// del blocco (il primo assoluto a tutta area, il secondo ancorato in fondo)
// ma condividere lo stesso indice/stato di pausa - un solo componente
// stateful che emette entrambi i pezzi evita che desincronizzino (es.
// sfondo che mostra un post diverso dal testo).
export function HeroPostFacebook({ post }: { post: PostFacebook[] }) {
  const [indice, setIndice] = useState(0);
  // Story 18.32: indice della foto corrente ENTRO il post corrente (un post
  // "album" ha piu' foto, ruotate sullo stesso timer di 10s prima di
  // avanzare al post successivo).
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [inPausa, setInPausa] = useState(false);

  // Si azzera ogni volta che cambia il post corrente (avanzamento
  // automatico, click freccia, click pallino) - mai una foto "vecchia"
  // mostrata all'apertura di un nuovo post. Pattern "adjusting state when a
  // prop changes" di React (aggiornamento durante il render, non in un
  // useEffect): eslint react-hooks/set-state-in-effect vieta una setState
  // incondizionata dentro un effect perche' produce un giro di render extra
  // evitabile - qui il confronto con l'ultimo indice visto e' fatto in
  // fase di render, stesso risultato senza l'effect.
  const [indicePrecedente, setIndicePrecedente] = useState(indice);
  if (indice !== indicePrecedente) {
    setIndicePrecedente(indice);
    setIndiceFoto(0);
  }

  const indiceValido = indiceEntroLimiti(indice, post.length);
  const attuale = post[indiceValido];
  const numeroFoto = attuale?.immaginiUrl.length ?? 0;

  // Un solo timer per foto e post (nessuna doppia cadenza da sincronizzare,
  // stesso principio gia' alla base di questo componente): ogni tick prova
  // prima ad avanzare alla foto successiva del post corrente, e solo
  // quando le foto del post sono esaurite avanza al post successivo.
  //
  // Fix code review (Blind Hunter + Edge Case Hunter, convergenti): la
  // versione precedente usava setInterval + setIndiceFoto(fotoAttuale => {
  // ...; setIndice(...); return fotoAttuale; }) - due bug collegati.
  // 1) Con un solo post disponibile (post.length <= 1) e piu' foto,
  //    avanti(indice, post.length) restituisce sempre lo stesso indice (0,
  //    invariato) - indice non cambia MAI, quindi il reset di indiceFoto
  //    (che dipende da indice !== indicePrecedente sopra) non scatta mai e
  //    lo sfondo resta bloccato per sempre sull'ultima foto dell'album,
  //    senza alcun controllo manuale per sbloccarlo (i controlli compaiono
  //    solo se post.length > 1).
  // 2) Chiamare setIndice da DENTRO l'updater funzionale di setIndiceFoto
  //    viola il contratto di purezza che React richiede per le funzioni
  //    updater - in StrictMode (dev) l'updater viene invocato due volte
  //    apposta per scovare proprio questo: setIndice sarebbe stato chiamato
  //    due volte, avanzando di due post invece di uno.
  //
  // setTimeout re-armato ad ogni tick (invece di setInterval) con
  // indiceFoto in dipendenza: legge indice/indiceFoto gia' disponibili in
  // chiusura invece di annidare setState dentro setState, e gestisce
  // esplicitamente il caso "foto esaurite ma un solo post disponibile"
  // ricominciando la rotazione delle foto da capo invece di bloccarsi.
  useEffect(() => {
    if (inPausa) return;
    // Nessuna rotazione possibile: un solo post con al piu' una foto.
    if (post.length <= 1 && numeroFoto <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      if (indiceFoto + 1 < numeroFoto) {
        setIndiceFoto(avanti(indiceFoto, numeroFoto));
      } else if (post.length > 1) {
        setIndice((i) => avanti(i, post.length));
      } else {
        // Foto esaurite ma un solo post disponibile: nessun "post
        // successivo" a cui passare, la rotazione delle foto ricomincia da
        // capo invece di bloccarsi sull'ultima (bug corretto in review).
        setIndiceFoto(0);
      }
    }, INTERVALLO_MS);
    return () => clearTimeout(id);
  }, [post.length, numeroFoto, indice, indiceFoto, inPausa]);

  if (post.length === 0) return null;

  const indiceFotoValido = indiceEntroLimiti(indiceFoto, numeroFoto);
  const immagineAttuale = numeroFoto > 0 ? attuale.immaginiUrl[indiceFotoValido] : undefined;

  return (
    <>
      <div
        className={styles.heroFotoPost}
        style={immagineAttuale ? { backgroundImage: `url(${immagineAttuale})` } : undefined}
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

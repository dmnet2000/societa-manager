"use client";

import { useActionState } from "react";
import { spostaGruppoAction, impostaVisibilitaGruppoAction } from "./actions";
import styles from "./ordine-squadre.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
  visibilePubblico: boolean;
};

// Story 19.15 (Epic 19, Ruolo Site Manager): mirror di VoceMenuPubblicoRow.tsx
// (Story 19.7) - originariamente SOLO i due bottoni Su/Giù ("nessun altro
// campo modificabile qui"), estesa in Story 19.16 con l'interruttore di
// visibilità pubblica gia' anticipato da quel commento. "primo"/"ultimo"
// arrivano dal Server Component genitore (l'ordine e' gia' noto lato
// server) - disabilitano il bottone di spostamento sul margine, ma il vero
// cancello resta lato server (spostaGruppoAction, che ignora una richiesta
// oltre il margine invece di fallire).
export function GruppoOrdineRow({
  gruppo,
  primo,
  ultimo,
}: {
  gruppo: Gruppo;
  primo: boolean;
  ultimo: boolean;
}) {
  const [spostaState, spostaAction, spostaPending] = useActionState(
    spostaGruppoAction,
    undefined
  );
  // Story 19.16: terzo useActionState indipendente sulla stessa card, mirror
  // esatto di VoceMenuPubblicoRow.tsx (visibileAction/visibilePending) -
  // stesso principio "un form/azione per ciascun controllo indipendente",
  // gia' in uso qui per i due bottoni Su/Giù sopra.
  const [visibilitaState, visibilitaAction, visibilitaPending] = useActionState(
    impostaVisibilitaGruppoAction,
    undefined
  );

  return (
    <article className={styles.card}>
      <div className={styles.intestazioneCard}>
        <div>
          <p className={styles.nomeGruppo}>{gruppo.nome}</p>
          <p className={styles.categoriaGruppo}>{gruppo.categoria}</p>
        </div>
        <div className={styles.azioniIntestazione}>
          <span
            className={gruppo.visibilePubblico ? styles.badgeSuccesso : styles.badgeDanger}
          >
            {gruppo.visibilePubblico ? "Visibile" : "Nascosta"}
          </span>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={gruppo.id} />
            <input type="hidden" name="direzione" value="su" />
            <button
              disabled={spostaPending || primo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${gruppo.nome}" più in alto`}
            >
              ↑
            </button>
          </form>
          <form action={spostaAction}>
            <input type="hidden" name="id" value={gruppo.id} />
            <input type="hidden" name="direzione" value="giu" />
            <button
              disabled={spostaPending || ultimo}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={`Sposta "${gruppo.nome}" più in basso`}
            >
              ↓
            </button>
          </form>
          <form action={visibilitaAction}>
            <input type="hidden" name="id" value={gruppo.id} />
            <input
              type="hidden"
              name="visibilePubblico"
              value={String(!gruppo.visibilePubblico)}
            />
            <button
              disabled={visibilitaPending}
              type="submit"
              className={styles.bottoneSecondario}
              aria-label={
                gruppo.visibilePubblico
                  ? `Nascondi "${gruppo.nome}" dalla pagina pubblica /squadre`
                  : `Rendi visibile "${gruppo.nome}" sulla pagina pubblica /squadre`
              }
            >
              {gruppo.visibilePubblico ? "Nascondi" : "Mostra"}
            </button>
          </form>
        </div>
      </div>
      {spostaState && "error" in spostaState && (
        <p role="alert" className={styles.errore}>
          {spostaState.error.message}
        </p>
      )}
      {visibilitaState && "error" in visibilitaState && (
        <p role="alert" className={styles.errore}>
          {visibilitaState.error.message}
        </p>
      )}
    </article>
  );
}

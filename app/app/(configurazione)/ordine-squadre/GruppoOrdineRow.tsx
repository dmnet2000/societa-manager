"use client";

import { useActionState } from "react";
import { spostaGruppoAction } from "./actions";
import styles from "./ordine-squadre.module.css";

type Gruppo = {
  id: string;
  nome: string;
  categoria: string;
};

// Story 19.15 (Epic 19, Ruolo Site Manager): mirror di VoceMenuPubblicoRow.tsx
// (Story 19.7), ma con SOLO i due bottoni Su/Giù - nessun altro campo
// modificabile qui (nessuna etichetta/url/toggle visibilità, questa storia
// non tocca altro che l'ordine). "primo"/"ultimo" arrivano dal Server
// Component genitore (l'ordine e' gia' noto lato server) - disabilitano il
// bottone di spostamento sul margine, ma il vero cancello resta lato server
// (spostaGruppoAction, che ignora una richiesta oltre il margine invece di
// fallire).
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

  return (
    <article className={styles.card}>
      <div className={styles.intestazioneCard}>
        <div>
          <p className={styles.nomeGruppo}>{gruppo.nome}</p>
          <p className={styles.categoriaGruppo}>{gruppo.categoria}</p>
        </div>
        <div className={styles.azioniIntestazione}>
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
        </div>
      </div>
      {spostaState && "error" in spostaState && (
        <p role="alert" className={styles.errore}>
          {spostaState.error.message}
        </p>
      )}
    </article>
  );
}

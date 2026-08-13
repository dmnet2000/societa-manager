"use client";

import { useActionState, useEffect, useRef } from "react";
import { caricaFotoSquadraAction } from "./actions";
import styles from "./gruppi.module.css";

// Story 18.4: componente condiviso tra GruppoRow.tsx (/app/gruppi,
// Admin/Dirigente) e MioGruppoCard.tsx (/app/i-miei-gruppi, Allenatore) -
// stesso pattern cross-file gia' in uso in questo modulo per
// AtletaTabellaRiga.tsx (Story 9.33 estensione), entrambe le pagine vivono
// nello stesso modulo (gruppi-allenatori), AD-2 non lo vieta. Cache-busting
// "?v=" sull'aggiornatoIl (stesso principio del logo, app/page.tsx) -
// urlFoto e' deterministico, senza il querystring il browser potrebbe
// continuare a mostrare la versione precedente dopo una sostituzione.
export function FotoSquadraForm({
  gruppoId,
  gruppoNome,
  fotoEsiste,
  fotoUrl,
  fotoAggiornataIl,
}: {
  gruppoId: string;
  gruppoNome: string;
  fotoEsiste: boolean;
  fotoUrl: string;
  fotoAggiornataIl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    caricaFotoSquadraAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Stesso pattern di reset gia' usato per gli altri form di questo modulo
  // (assegnaAllenatore/assegnaAtleta/creaEAssegnaAtleta in GruppoRow.tsx) -
  // senza, l'input file resterebbe "valorizzato" dopo un upload riuscito.
  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className={styles.fotoSquadra}>
      {fotoEsiste && (
        <img
          className={styles.anteprimaFotoSquadra}
          src={`${fotoUrl}?v=${encodeURIComponent(fotoAggiornataIl ?? "")}`}
          alt={`Foto di squadra di ${gruppoNome}`}
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        className={`${styles.formCompatto} ${styles.formInline}`}
      >
        <input type="hidden" name="gruppoId" value={gruppoId} />
        <label htmlFor={`foto-squadra-${gruppoId}`}>Foto di squadra</label>
        <input
          id={`foto-squadra-${gruppoId}`}
          type="file"
          name="file"
          accept="image/png,image/jpeg"
          required
        />
        <button disabled={pending} type="submit" className={styles.bottoneCompatto}>
          {fotoEsiste ? "Sostituisci" : "Carica"}
        </button>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

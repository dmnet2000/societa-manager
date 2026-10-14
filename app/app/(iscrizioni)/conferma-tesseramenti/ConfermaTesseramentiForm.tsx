"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ordinaRigheTesseramento,
  prossimoOrdinamentoTesseramenti,
  type ColonnaOrdinamentoTesseramenti,
  type OrdinamentoTesseramenti,
} from "@/lib/ordina-righe-tesseramento";
import { salvaTesseramenti } from "./actions";
import styles from "./conferma-tesseramenti.module.css";

export type ColonnaFederazione = {
  id: string;
  etichetta: string;
  nome: string;
  attiva: boolean;
};

export type AtletaTesseramentoRiga = {
  id: string;
  nome: string;
  codiceFiscale: string;
  iscrizioneAttiva: boolean;
  federazioniIniziali: string[];
};

type Selezione = Record<string, string[]>;

function selezioneIniziale(atlete: AtletaTesseramentoRiga[]): Selezione {
  return Object.fromEntries(atlete.map((a) => [a.id, a.federazioniIniziali]));
}

function stessoInsieme(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// Story 26.2 (Epic 26, Tesseramento multi-Federazione): matrice Atlete x
// Federazioni, un'unica tabella per confermare nuovi tesseramenti e
// correggere quelli esistenti (decisione utente 2026-10-12), sostituisce la
// conferma massiva con un checkbox per riga della Story 13.1. Solo le righe
// diverse dallo stato iniziale inviano "atletaModificata". Prima di
// svuotare un Tesseramento esistente compare una conferma in pagina (mai
// window.confirm); la Server Action rifiuta comunque lo svuotamento senza
// "confermaRimozioneTotale".
export function ConfermaTesseramentiForm({
  atlete,
  colonne,
}: {
  atlete: AtletaTesseramentoRiga[];
  colonne: ColonnaFederazione[];
}) {
  const [state, formAction, pending] = useActionState(salvaTesseramenti, undefined);
  const [selezione, setSelezione] = useState<Selezione>(() => selezioneIniziale(atlete));
  const [atleteBase, setAtleteBase] = useState(atlete);
  const [mostraConferma, setMostraConferma] = useState(false);
  // Review fix: la conferma dello svuotamento non legge piu'
  // SubmitEvent.submitter (assente su Safari/iOS < 15.4: la conferma si
  // riaprirebbe all'infinito) - il bottone "Conferma" alza questo flag nel
  // suo onClick, che scatta prima dell'evento submit del form.
  const confermatoRef = useRef(false);
  const confermaRef = useRef<HTMLDivElement>(null);
  // Ordinamento client-side a click sulle intestazioni (mirror di Story
  // 9.46 in conferma-iscrizioni/IscrizioniElenco.tsx), iniziale per Nome
  // crescente come carica la pagina. Codice Fiscale volutamente escluso.
  // Righe con key = id Atleta: riordinarle non perde le caselle spuntate.
  const [ordinamento, setOrdinamento] = useState<OrdinamentoTesseramenti>({
    colonna: "nome",
    direzione: "asc",
  });
  const atleteOrdinate = useMemo(
    () => ordinaRigheTesseramento(atlete, ordinamento.colonna, ordinamento.direzione),
    [atlete, ordinamento]
  );

  // Focus sul riquadro di conferma all'apertura: su una tabella lunga
  // potrebbe comparire fuori vista e "Salva" sembrerebbe non fare nulla.
  useEffect(() => {
    if (mostraConferma) confermaRef.current?.focus();
  }, [mostraConferma]);

  // Dopo un salvataggio revalidatePath rimanda nuovi dati: la selezione
  // riparte dallo stato salvato (pattern "adjust state during render").
  if (atleteBase !== atlete) {
    setAtleteBase(atlete);
    setSelezione(selezioneIniziale(atlete));
    setMostraConferma(false);
  }

  const modificate = atlete.filter(
    (a) => !stessoInsieme(selezione[a.id] ?? [], a.federazioniIniziali)
  );
  const svuotate = modificate.filter(
    (a) => a.federazioniIniziali.length > 0 && (selezione[a.id] ?? []).length === 0
  );

  function cambia(atletaId: string, federazioneId: string, spuntato: boolean) {
    // Review fix: la richiesta di conferma si riferisce alla selezione che
    // l'ha aperta - qualunque modifica successiva la chiude.
    setMostraConferma(false);
    setSelezione((corrente) => {
      const ids = corrente[atletaId] ?? [];
      return {
        ...corrente,
        [atletaId]: spuntato
          ? [...ids, federazioneId]
          : ids.filter((id) => id !== federazioneId),
      };
    });
  }

  // aria-sort sul th, aria-label con la direzione sul bottone, freccia solo
  // decorativa - come IscrizioniElenco.tsx (Story 9.46).
  function intestazioneOrdinabile(
    colonna: ColonnaOrdinamentoTesseramenti,
    etichetta: string,
    contenuto: ReactNode = etichetta,
    title?: string
  ) {
    const attiva = ordinamento.colonna === colonna;
    const direzione = attiva ? ordinamento.direzione : null;
    const ariaSort = !attiva ? "none" : direzione === "asc" ? "ascending" : "descending";
    const ariaLabel = !attiva
      ? `Ordina per ${etichetta}`
      : direzione === "asc"
        ? `${etichetta}, ordinato crescente. Ordina decrescente`
        : `${etichetta}, ordinato decrescente. Ordina crescente`;

    return (
      <th key={colonna} scope="col" aria-sort={ariaSort} title={title} className={styles.thOrdinabile}>
        <button
          type="button"
          className={styles.bottoneOrdinamento}
          onClick={() =>
            setOrdinamento((attuale) => prossimoOrdinamentoTesseramenti(attuale, colonna))
          }
          aria-label={ariaLabel}
        >
          {contenuto}
          {attiva && (
            <span className={styles.frecciaOrdinamento} aria-hidden="true">
              {direzione === "asc" ? "▲" : "▼"}
            </span>
          )}
        </button>
      </th>
    );
  }

  function onSubmit(evento: FormEvent<HTMLFormElement>) {
    const confermato = confermatoRef.current;
    confermatoRef.current = false;
    if (svuotate.length > 0 && !confermato) {
      evento.preventDefault();
      setMostraConferma(true);
    }
  }

  if (colonne.length === 0) {
    return (
      <p className={styles.messaggioVuoto}>
        Nessuna federazione attiva: aggiungine una dalla pagina Federazioni per
        poter registrare i tesseramenti.
      </p>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit}>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              {intestazioneOrdinabile("nome", "Nome")}
              <th scope="col">Codice Fiscale</th>
              {intestazioneOrdinabile("stato", "Stato Iscrizione")}
              {colonne.map((c) =>
                intestazioneOrdinabile(
                  `federazione:${c.id}`,
                  c.nome,
                  <span>
                    {c.etichetta}
                    {!c.attiva && <span className={styles.disattivata}> (disattivata)</span>}
                  </span>,
                  c.nome
                )
              )}
            </tr>
          </thead>
          <tbody>
            {atleteOrdinate.map((atleta) => {
              const ids = selezione[atleta.id] ?? [];
              const modificata = !stessoInsieme(ids, atleta.federazioniIniziali);
              return (
                <tr key={atleta.id} className={modificata ? styles.rigaModificata : undefined}>
                  <td>
                    {atleta.nome}
                    {modificata && (
                      <input type="hidden" name="atletaModificata" value={atleta.id} />
                    )}
                  </td>
                  <td>{atleta.codiceFiscale}</td>
                  <td className={styles.statoIscrizione}>
                    {atleta.iscrizioneAttiva ? "Iscritta" : "Non iscritta"}
                  </td>
                  {colonne.map((c) => {
                    const inizialmente = atleta.federazioniIniziali.includes(c.id);
                    return (
                      <td key={c.id}>
                        <label className={styles.etichettaCheckbox}>
                          <input
                            type="checkbox"
                            name={`federazione:${atleta.id}`}
                            value={c.id}
                            checked={ids.includes(c.id)}
                            // Disattivata: si puo' solo togliere dove era
                            // gia' presente, mai aggiungere.
                            disabled={!c.attiva && !inizialmente}
                            onChange={(e) => cambia(atleta.id, c.id, e.target.checked)}
                            className={styles.checkbox}
                            aria-label={`${atleta.nome}: ${c.nome}`}
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {mostraConferma && svuotate.length > 0 && (
        <div
          ref={confermaRef}
          tabIndex={-1}
          role="alertdialog"
          aria-labelledby="titolo-conferma-svuotamento"
          className={styles.conferma}
        >
          <input type="hidden" name="confermaRimozioneTotale" value="1" />
          <p id="titolo-conferma-svuotamento">
            Queste Atlete non avranno più alcuna federazione e risulteranno{" "}
            <strong>Non tesserate</strong>:
          </p>
          <ul>
            {svuotate.map((a) => (
              <li key={a.id}>{a.nome}</li>
            ))}
          </ul>
          <div className={styles.azioniConferma}>
            <button
              type="submit"
              onClick={() => {
                confermatoRef.current = true;
              }}
              disabled={pending}
              className={styles.bottonePericolo}
            >
              Conferma
            </button>
            <button
              type="button"
              className={styles.bottoneSecondario}
              onClick={() => setMostraConferma(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && modificate.length === 0 && (
        <p role="status" className={styles.successo}>
          Tesseramenti salvati.
        </p>
      )}
      <div className={styles.saveFooter}>
        <button
          disabled={pending || modificate.length === 0}
          type="submit"
          className={styles.bottoneSalva}
        >
          Salva{modificate.length > 0 ? ` (${modificate.length})` : ""}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { confermaTesseramenti } from "./actions";
import styles from "./conferma-tesseramenti.module.css";

export type AtletaTesseramentoRiga = {
  id: string;
  nome: string;
  codiceFiscale: string;
  iscrizioneAttiva: boolean;
  tesseramentoConfermato: boolean;
};

// Story 13.1 estensione (2026-08-06): sostituisce TesseramentoRow.tsx (un
// bottone "Conferma" per riga, gated su Iscrizione attiva) con un'unica
// form a livello di tabella - un checkbox per Atleta non ancora tesserata
// (nessun gate sull'Iscrizione, "Stato Iscrizione" resta solo informativo)
// piu' un bottone unico "Conferma selezionate" a fondo pagina. Stesso
// pattern di app/(presenze)/presenze/PresenzeForm.tsx (checkbox + submit
// unico via FormData.getAll, non un fetch per riga).
export function ConfermaTesseramentiForm({
  atlete,
}: {
  atlete: AtletaTesseramentoRiga[];
}) {
  const [state, formAction, pending] = useActionState(
    confermaTesseramenti,
    undefined
  );

  return (
    <form action={formAction}>
      <div className={styles.scrollWrapper}>
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codice Fiscale</th>
              <th>Stato Iscrizione</th>
              <th>Stato Tesseramento</th>
            </tr>
          </thead>
          <tbody>
            {atlete.map((atleta) => (
              <tr key={atleta.id}>
                <td>{atleta.nome}</td>
                <td>{atleta.codiceFiscale}</td>
                <td className={styles.statoIscrizione}>
                  {atleta.iscrizioneAttiva ? "Iscritta" : "Non iscritta"}
                </td>
                <td>
                  <div className={styles.stato}>
                    {atleta.tesseramentoConfermato && atleta.iscrizioneAttiva ? (
                      "Confermato"
                    ) : atleta.tesseramentoConfermato ? (
                      // Stessa nota della Story 13.1 originale: se
                      // l'Iscrizione collegata viene esclusa dopo la
                      // conferma, il Tesseramento resta confermato nel DB
                      // (nessuna esclusione a cascata, fuori scope) ma la
                      // pagina lo segnala invece di mostrare "Confermato"
                      // accanto a "Non iscritta" senza spiegazione. Review
                      // fix (estensione 2026-08-06): "non attiva" invece di
                      // "non più attiva" - dopo la rimozione della
                      // dipendenza da Iscrizione, questo ramo e' raggiunto
                      // anche da un'Atleta la cui Iscrizione non e' MAI
                      // stata attiva, non solo da una esclusa dopo la
                      // conferma - "non più" implicherebbe una storia che
                      // potrebbe non essere mai esistita.
                      "Confermato (Iscrizione non attiva)"
                    ) : (
                      <label className={styles.etichettaCheckbox}>
                        <input
                          type="checkbox"
                          name="atletaId"
                          value={atleta.id}
                          className={styles.checkbox}
                        />
                        Conferma
                      </label>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state && "error" in state && (
        <p role="alert" className={styles.errore}>
          {state.error.message}
        </p>
      )}
      {state && "success" in state && (
        <p role="status" className={styles.successo}>
          Tesseramenti confermati.
        </p>
      )}
      <div className={styles.saveFooter}>
        <button disabled={pending} type="submit" className={styles.bottoneSalva}>
          Conferma selezionate
        </button>
      </div>
    </form>
  );
}

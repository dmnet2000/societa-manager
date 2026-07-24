"use client";

import { useActionState } from "react";
import { confermaCertificato, ottieniUrlCertificatoConferma } from "./actions";
import styles from "./conferma-certificati.module.css";

type Atleta = {
  id: string;
  nome: string;
};

// AC #1/#2: un solo form copre sia la conferma di un Certificato gia'
// caricato (filePath presente, data reali da leggere nel file prima di
// confermare) sia l'inserimento manuale ex-novo (filePath assente, file
// opzionale allegabile qui) - stesso Server Action per entrambi i casi.
export function ConfermaCertificatoRow({
  atleta,
  filePath,
  dataInizioValidita = "",
  dataFineValidita = "",
  mesiValidita,
  modulo,
}: {
  atleta: Atleta;
  filePath: string | null;
  dataInizioValidita?: string;
  dataFineValidita?: string;
  mesiValidita?: number | null;
  modulo?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    confermaCertificato,
    undefined
  );

  return (
    <li className={styles.card}>
      <strong className={styles.nomeAtleta}>{atleta.nome}</strong>

      {filePath && (
        <form action={ottieniUrlCertificatoConferma.bind(null, filePath)}>
          <button type="submit" className={styles.bottoneVisualizza}>
            Visualizza certificato caricato
          </button>
        </form>
      )}

      <form action={formAction}>
        <input type="hidden" name="atletaId" value={atleta.id} />
        <div className={styles.campo}>
          <label>
            Data inizio validità
            <input
              type="date"
              name="dataInizioValidita"
              defaultValue={dataInizioValidita}
            />
          </label>
        </div>
        <div className={styles.campo}>
          <label>
            Data fine validità
            <input
              type="date"
              name="dataFineValidita"
              defaultValue={dataFineValidita}
              required
            />
          </label>
        </div>
        <div className={styles.campo}>
          <label>
            Mesi validità
            <input
              type="number"
              name="mesiValidita"
              min="1"
              defaultValue={mesiValidita ?? ""}
            />
          </label>
        </div>
        <div className={styles.campo}>
          <label>
            {filePath
              ? "Sostituisci con un file scansionato (opzionale)"
              : "Allega scansione del certificato (opzionale)"}
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" />
          </label>
        </div>
        {state && "error" in state && (
          <p role="alert" className={styles.errore}>
            {state.error.message}
          </p>
        )}
        <button disabled={pending} type="submit" className={styles.bottone}>
          Conferma
        </button>
      </form>
    </li>
  );
}

"use client";

import { useActionState } from "react";
import { confermaCertificato, ottieniUrlCertificatoConferma } from "./actions";

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
}: {
  atleta: Atleta;
  filePath: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    confermaCertificato,
    undefined
  );

  return (
    <li>
      <strong>{atleta.nome}</strong>

      {filePath && (
        <form action={ottieniUrlCertificatoConferma.bind(null, filePath)}>
          <button type="submit">Visualizza certificato caricato</button>
        </form>
      )}

      <form action={formAction}>
        <input type="hidden" name="atletaId" value={atleta.id} />
        <label>
          Data inizio validità
          <input type="date" name="dataInizioValidita" />
        </label>
        <label>
          Data fine validità
          <input type="date" name="dataFineValidita" required />
        </label>
        <label>
          Mesi validità
          <input type="number" name="mesiValidita" min="1" />
        </label>
        <label>
          Modulo
          <input type="text" name="modulo" />
        </label>
        <label>
          {filePath
            ? "Sostituisci con un file scansionato (opzionale)"
            : "Allega scansione del certificato (opzionale)"}
          <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" />
        </label>
        {state && "error" in state && <p role="alert">{state.error.message}</p>}
        <button disabled={pending} type="submit">
          Conferma
        </button>
      </form>
    </li>
  );
}

import {
  leggiRichiestaBackup,
  type RispostaLeggiBackup,
} from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { leggiEpocaRichiesta } from "@/lib/api-tablet/epoca-richiesta";
import {
  erroreInternoTablet,
  rispostaErroreTablet,
  rispostaJsonTablet,
} from "@/lib/api-tablet/risposta-errore";
import { leggiBackup, salvaBackup } from "@/lib/referto-in-corso";

// PUT /api/tablet/v1/gare/{garaId}/backup?epoca=N: salva il backup opaco del
// registro degli eventi (AD-7, AD-11, AD-15). Il blob non si interpreta e non
// si scrive mai nei log (contiene nomi).
export async function PUT(request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const { garaId } = await params;
  const esitoEpoca = leggiEpocaRichiesta(request);
  if (!esitoEpoca.ok) return esitoEpoca.risposta;
  const { epoca } = esitoEpoca;

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return rispostaErroreTablet("VALIDATION", "Corpo della richiesta non valido.", 400);
  }
  const richiesta = leggiRichiestaBackup(json);
  if (richiesta === undefined) {
    return rispostaErroreTablet("VALIDATION", "Dati del backup non validi.", 400);
  }

  try {
    const esito = await salvaBackup(garaId, epoca, richiesta);
    if (esito.esito === "hash-errato") {
      return rispostaErroreTablet("VALIDATION", "Il codice di controllo del backup non coincide.", 400);
    }
    if (esito.esito === "conflitto") {
      return rispostaErroreTablet(
        "CONFLITTO",
        "Sul server c'e' gia' il backup di un altro registro per questa gara.",
        409
      );
    }
    return rispostaJsonTablet(esito.salvato);
  } catch {
    console.error("api-tablet INTERNAL motivo=SALVA_BACKUP");
    return erroreInternoTablet();
  }
}

// GET /api/tablet/v1/gare/{garaId}/backup?epoca=N: il backup salvato della
// gara, o { backup: null } se non c'e' (serve alla ripresa, story 4.10).
export async function GET(request: Request, { params }: { params: Promise<{ garaId: string }> }) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const { garaId } = await params;
  const esitoEpoca = leggiEpocaRichiesta(request);
  if (!esitoEpoca.ok) return esitoEpoca.risposta;
  const { epoca } = esitoEpoca;

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  try {
    const backup = await leggiBackup(garaId);
    const corpo: RispostaLeggiBackup = { backup };
    return rispostaJsonTablet(corpo);
  } catch {
    console.error("api-tablet INTERNAL motivo=LEGGI_BACKUP");
    return erroreInternoTablet();
  }
}

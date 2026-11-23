import {
  leggiRichiestaRisultatoSet,
  type RispostaRisultatoSet,
} from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { leggiEpocaRichiesta } from "@/lib/api-tablet/epoca-richiesta";
import {
  erroreInternoTablet,
  rispostaErroreTablet,
  rispostaJsonTablet,
} from "@/lib/api-tablet/risposta-errore";
import { salvaRisultatoSet } from "@/lib/referto-in-corso";

// PUT /api/tablet/v1/gare/{garaId}/risultati-set/{numeroSet}?epoca=N: salva il
// risultato di un set chiuso nel referto in corso (AD-7, AD-8, AD-11). Upsert
// monotono su seqFinale: la risposta e' sempre la riga salvata sul server.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ garaId: string; numeroSet: string }> }
) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const { garaId, numeroSet: numeroSetTesto } = await params;
  const esitoEpoca = leggiEpocaRichiesta(request);
  if (!esitoEpoca.ok) return esitoEpoca.risposta;
  const { epoca } = esitoEpoca;

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  const numeroSet = /^[1-5]$/.test(numeroSetTesto) ? Number(numeroSetTesto) : undefined;
  if (numeroSet === undefined) {
    return rispostaErroreTablet("VALIDATION", "Numero del set non valido.", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return rispostaErroreTablet("VALIDATION", "Corpo della richiesta non valido.", 400);
  }
  const richiesta = leggiRichiestaRisultatoSet(json);
  if (richiesta === undefined) {
    return rispostaErroreTablet("VALIDATION", "Dati del risultato non validi.", 400);
  }

  try {
    const riga = await salvaRisultatoSet(garaId, epoca, numeroSet, richiesta);
    const corpo: RispostaRisultatoSet = riga;
    return rispostaJsonTablet(corpo);
  } catch {
    console.error("api-tablet INTERNAL motivo=SALVA_RISULTATO_SET");
    return erroreInternoTablet();
  }
}

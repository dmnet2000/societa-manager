import type { RispostaParametri } from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { leggiEpocaRichiesta } from "@/lib/api-tablet/epoca-richiesta";
import { erroreInternoTablet, rispostaJsonTablet } from "@/lib/api-tablet/risposta-errore";
import { leggiParametriGara } from "@/lib/parametri-formato";

// GET /api/tablet/v1/gare/{garaId}/parametri?epoca=N: i parametri effettivi
// del formato (AD-5) di una gara assegnata a questo tablet con questa epoca.
// Ordine: versione dell'app (426), epoca (400 VALIDATION), autorizzazione
// (401/403/409 RIASSEGNATA, story 2.6), poi i parametri.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ garaId: string }> }
) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const { garaId } = await params;
  const esitoEpoca = leggiEpocaRichiesta(request);
  if (!esitoEpoca.ok) return esitoEpoca.risposta;
  const { epoca } = esitoEpoca;

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  let corpo: RispostaParametri;
  try {
    const parametri = await leggiParametriGara(garaId);
    if (parametri === null) {
      console.error("api-tablet INTERNAL motivo=GARA_SENZA_PARTITA");
      return erroreInternoTablet();
    }
    corpo = { parametri };
  } catch {
    console.error("api-tablet INTERNAL motivo=PARAMETRI_GARA");
    return erroreInternoTablet();
  }
  return rispostaJsonTablet(corpo);
}

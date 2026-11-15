import { NextResponse } from "next/server";
import type { RispostaParametri } from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { erroreInternoTablet, rispostaErroreTablet } from "@/lib/api-tablet/risposta-errore";
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
  const testoEpoca = new URL(request.url).searchParams.get("epoca");
  const epoca = testoEpoca !== null && /^[1-9][0-9]*$/.test(testoEpoca) ? Number(testoEpoca) : NaN;
  if (!Number.isSafeInteger(epoca)) {
    return rispostaErroreTablet("VALIDATION", "Epoca mancante o non valida.", 400);
  }

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
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

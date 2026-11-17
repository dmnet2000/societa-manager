import { NextResponse } from "next/server";
import type { RispostaRose } from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { creaClientSupabaseTablet } from "@/lib/api-tablet/client-supabase-tablet";
import { erroreInternoTablet, rispostaErroreTablet } from "@/lib/api-tablet/risposta-errore";
import { RosaForbiddenError } from "@/lib/db-rls/rosa";
import { leggiRoseGara } from "@/lib/rose-gara";

// GET /api/tablet/v1/gare/{garaId}/rose?epoca=N: le rose di casa e ospite di
// una gara assegnata a questo tablet (CAP-3). Le legge con la sessione del
// tablet, cosi valgono le RLS (AD-17).
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

  let corpo: RispostaRose;
  try {
    const supabase = creaClientSupabaseTablet(autorizzazione.jwt);
    if (supabase === null) {
      console.error("api-tablet INTERNAL motivo=CONFIGURAZIONE_MANCANTE");
      return erroreInternoTablet();
    }
    corpo = await leggiRoseGara(supabase, garaId);
  } catch (errore) {
    if (errore instanceof RosaForbiddenError) {
      console.warn("api-tablet FORBIDDEN motivo=ROSE_RLS");
      return rispostaErroreTablet("FORBIDDEN", "Accesso alle rose non consentito.", 403);
    }
    console.error("api-tablet INTERNAL motivo=ROSE_GARA");
    return erroreInternoTablet();
  }
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

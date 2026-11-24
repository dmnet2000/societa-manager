import type { RispostaRose } from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { leggiEpocaRichiesta } from "@/lib/api-tablet/epoca-richiesta";
import {
  clientSupabaseTabletOErrore,
  erroreInternoTablet,
  rispostaJsonTablet,
  rispostaRoseNonConsentite,
} from "@/lib/api-tablet/risposta-errore";
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
  const esitoEpoca = leggiEpocaRichiesta(request);
  if (!esitoEpoca.ok) return esitoEpoca.risposta;
  const { epoca } = esitoEpoca;

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  let corpo: RispostaRose;
  try {
    const client = clientSupabaseTabletOErrore(autorizzazione.jwt);
    if (!client.ok) return client.risposta;
    const { supabase } = client;
    corpo = await leggiRoseGara(supabase, garaId);
  } catch (errore) {
    if (errore instanceof RosaForbiddenError) {
      return rispostaRoseNonConsentite();
    }
    console.error("api-tablet INTERNAL motivo=ROSE_GARA");
    return erroreInternoTablet();
  }
  return rispostaJsonTablet(corpo);
}

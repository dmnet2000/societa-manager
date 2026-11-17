import { NextResponse } from "next/server";
import { leggiRichiestaSalvaRosa, type RispostaSalvaRosa } from "@/lib/api-tablet/contratto";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { autorizzaGaraTablet } from "@/lib/api-tablet/gare-tablet";
import { creaClientSupabaseTablet } from "@/lib/api-tablet/client-supabase-tablet";
import { erroreInternoTablet, rispostaErroreTablet } from "@/lib/api-tablet/risposta-errore";
import { RosaForbiddenError, RosaValidationError } from "@/lib/db-rls/rosa";
import { salvaRosaGara } from "@/lib/rose-gara";

// PUT /api/tablet/v1/gare/{garaId}/rose/{lato}?epoca=N: salva la rosa di un
// lato (casa|ospite, AD-16) con versioneBase e idModifica (AD-6, AD-11).
// Versione superata: 409 CONFLITTO; idModifica ripetuto: 200 stessa versione.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ garaId: string; lato: string }> }
) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const { garaId, lato } = await params;
  const testoEpoca = new URL(request.url).searchParams.get("epoca");
  const epoca = testoEpoca !== null && /^[1-9][0-9]*$/.test(testoEpoca) ? Number(testoEpoca) : NaN;
  if (!Number.isSafeInteger(epoca)) {
    return rispostaErroreTablet("VALIDATION", "Epoca mancante o non valida.", 400);
  }
  if (lato !== "casa" && lato !== "ospite") {
    return rispostaErroreTablet("VALIDATION", "Lato non valido: usa casa oppure ospite.", 400);
  }

  const autorizzazione = await autorizzaGaraTablet(request, garaId, epoca);
  if (!autorizzazione.ok) return autorizzazione.risposta;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return rispostaErroreTablet("VALIDATION", "Corpo della richiesta non valido.", 400);
  }
  const richiesta = leggiRichiestaSalvaRosa(json);
  if (richiesta === undefined) {
    return rispostaErroreTablet("VALIDATION", "Dati della rosa non validi.", 400);
  }

  try {
    const supabase = creaClientSupabaseTablet(autorizzazione.jwt);
    if (supabase === null) {
      console.error("api-tablet INTERNAL motivo=CONFIGURAZIONE_MANCANTE");
      return erroreInternoTablet();
    }
    const esito = await salvaRosaGara(supabase, { garaId, lato, ...richiesta });
    if (esito.esito === "conflitto") {
      return rispostaErroreTablet(
        "CONFLITTO",
        "La rosa è stata modificata da un altro dispositivo. Ricarica e riprova.",
        409
      );
    }
    const corpo: RispostaSalvaRosa = { versione: esito.versione };
    return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
  } catch (errore) {
    if (errore instanceof RosaForbiddenError) {
      console.warn("api-tablet FORBIDDEN motivo=ROSE_RLS");
      return rispostaErroreTablet("FORBIDDEN", "Accesso alle rose non consentito.", 403);
    }
    if (errore instanceof RosaValidationError) {
      // I messaggi del database iniziano con "VALIDATION": non si mostrano.
      const messaggio = errore.message.startsWith("VALIDATION")
        ? "Rosa non valida."
        : errore.message;
      return rispostaErroreTablet("VALIDATION", messaggio, 400);
    }
    console.error("api-tablet INTERNAL motivo=SALVA_ROSA");
    return erroreInternoTablet();
  }
}

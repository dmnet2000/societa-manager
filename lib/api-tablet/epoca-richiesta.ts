import "server-only";
import type { NextResponse } from "next/server";
import type { ErroreApi } from "./contratto";
import { rispostaErroreTablet } from "./risposta-errore";

export type EsitoEpocaRichiesta =
  | { ok: true; epoca: number }
  | { ok: false; risposta: NextResponse<ErroreApi> };

// Epoca dalla query `?epoca=N` (intero positivo sicuro): altrimenti 400
// VALIDATION. Va chiamata prima di autorizzaGaraTablet.
export function leggiEpocaRichiesta(request: Request): EsitoEpocaRichiesta {
  const testoEpoca = new URL(request.url).searchParams.get("epoca");
  const epoca = testoEpoca !== null && /^[1-9][0-9]*$/.test(testoEpoca) ? Number(testoEpoca) : NaN;
  if (!Number.isSafeInteger(epoca)) {
    return {
      ok: false,
      risposta: rispostaErroreTablet("VALIDATION", "Epoca mancante o non valida.", 400),
    };
  }
  return { ok: true, epoca };
}

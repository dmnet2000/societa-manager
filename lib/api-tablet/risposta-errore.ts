import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CodiceErrore, ErroreApi } from "./contratto";
import { creaClientSupabaseTablet } from "./client-supabase-tablet";

// Forma unica degli errori dell'API del tablet, definita dal contratto:
// { error: { code, message } }.
export function rispostaErroreTablet(
  code: CodiceErrore,
  message: string,
  status: number
): NextResponse<ErroreApi> {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

// Errore generico del server (500 INTERNAL): stesso testo in tutta l'API del
// tablet, mai dettagli interni nella risposta.
export function erroreInternoTablet(): NextResponse<ErroreApi> {
  return rispostaErroreTablet("INTERNAL", "Errore del server. Riprova.", 500);
}

// 403 delle rose negate dalle RLS: stesso testo e stesso log in tutta l'API.
export function rispostaRoseNonConsentite(): NextResponse<ErroreApi> {
  console.warn("api-tablet FORBIDDEN motivo=ROSE_RLS");
  return rispostaErroreTablet("FORBIDDEN", "Accesso alle rose non consentito.", 403);
}

export type EsitoClientTablet =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; risposta: NextResponse<ErroreApi> };

// Client Supabase con la sessione del tablet, oppure 500 INTERNAL (con log
// CONFIGURAZIONE_MANCANTE) se la configurazione pubblica manca.
export function clientSupabaseTabletOErrore(jwt: string): EsitoClientTablet {
  const supabase = creaClientSupabaseTablet(jwt);
  if (supabase === null) {
    console.error("api-tablet INTERNAL motivo=CONFIGURAZIONE_MANCANTE");
    return { ok: false, risposta: erroreInternoTablet() };
  }
  return { ok: true, supabase };
}

// Risposta 200 JSON non cacheabile delle rotte dell'epic 3.
export function rispostaJsonTablet<T>(corpo: T): NextResponse<T> {
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

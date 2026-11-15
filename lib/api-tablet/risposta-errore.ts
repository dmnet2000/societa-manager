import "server-only";
import { NextResponse } from "next/server";
import type { CodiceErrore, ErroreApi } from "./contratto";

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

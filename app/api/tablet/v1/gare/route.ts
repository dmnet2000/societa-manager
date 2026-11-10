import { NextResponse } from "next/server";
import type { RispostaGare } from "@/lib/api-tablet/contratto";
import { autenticaTablet } from "@/lib/api-tablet/autenticazione";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";

// Story 2.1 (epic tablet-collegato): tracer lato server dell'API del tablet.
// Prima il controllo della versione dell'app (story 2.2, AD-13), poi
// l'autenticazione del JWT Bearer; risponde con un elenco vuoto - le gare
// assegnate arrivano con la story 2.5.
export async function GET(request: Request) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const autenticazione = await autenticaTablet(request);
  if (!autenticazione.ok) return autenticazione.risposta;

  const corpo: RispostaGare = { gare: [] };
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

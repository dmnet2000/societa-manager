import { NextResponse } from "next/server";
import { autenticaTablet } from "@/lib/api-tablet/autenticazione";

// Story 2.1 (epic tablet-collegato): tracer lato server dell'API del tablet.
// Autentica il JWT Bearer, poi risponde con un elenco vuoto - le gare
// assegnate arrivano con la story 2.5.
export async function GET(request: Request) {
  const autenticazione = await autenticaTablet(request);
  if (!autenticazione.ok) return autenticazione.risposta;

  return NextResponse.json(
    { gare: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

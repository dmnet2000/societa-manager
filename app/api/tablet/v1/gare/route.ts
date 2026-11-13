import { NextResponse } from "next/server";
import type { RispostaGare } from "@/lib/api-tablet/contratto";
import { autenticaTablet } from "@/lib/api-tablet/autenticazione";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { elencaGareTablet } from "@/lib/api-tablet/gare-tablet";
import { rispostaErroreTablet } from "@/lib/api-tablet/risposta-errore";

// Story 2.1 (epic tablet-collegato): tracer lato server dell'API del tablet.
// Prima il controllo della versione dell'app (story 2.2, AD-13), poi
// l'autenticazione del JWT Bearer (ruolo TABLET dalla story 2.6); la story
// 2.6 restituisce le gare assegnate al tablet chiamante con la loro epoca.
export async function GET(request: Request) {
  const versione = verificaVersioneApp(request);
  if (!versione.ok) return versione.risposta;

  const autenticazione = await autenticaTablet(request);
  if (!autenticazione.ok) return autenticazione.risposta;

  let corpo: RispostaGare;
  try {
    corpo = { gare: await elencaGareTablet(autenticazione.utenteId) };
  } catch {
    console.error("api-tablet INTERNAL motivo=ELENCO_GARE");
    return rispostaErroreTablet("INTERNAL", "Errore del server. Riprova.", 500);
  }
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

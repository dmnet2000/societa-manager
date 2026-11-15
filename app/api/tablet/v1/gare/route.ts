import { NextResponse } from "next/server";
import type { RispostaGare } from "@/lib/api-tablet/contratto";
import { autenticaTablet } from "@/lib/api-tablet/autenticazione";
import { verificaVersioneApp } from "@/lib/api-tablet/versione-app";
import { elencaGareTablet } from "@/lib/api-tablet/gare-tablet";
import { erroreInternoTablet } from "@/lib/api-tablet/risposta-errore";

// GET /api/tablet/v1/gare: le gare assegnate al tablet chiamante, con la
// loro epoca (AD-2, AD-15). Prima il controllo della versione dell'app
// (AD-13, 426 APP_OBSOLETA), poi l'autenticazione del JWT Bearer con utente
// attivo e ruolo TABLET (401 / 403, anche quando la verifica dell'utente non
// riesce: fail-closed); un errore nella lettura delle gare e' 500 INTERNAL.
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
    return erroreInternoTablet();
  }
  return NextResponse.json(corpo, { headers: { "Cache-Control": "no-store" } });
}

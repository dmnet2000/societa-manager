import "server-only";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP, leggiVersioneApp } from "./contratto";
import { rispostaErroreTablet } from "./risposta-errore";

// Story 2.2 (epic tablet-collegato): controllo della versione dell'app (AD-13).
// Va chiamato PRIMA di autenticaTablet in ogni Route Handler dell'API del
// tablet. Fail-closed: header assente, non intero o sotto il minimo -> 426
// APP_OBSOLETA. Il minimo e' la variabile del worker TABLET_APP_VERSIONE_MINIMA
// (assente o non valida = 1), cosi' si alza senza ricompilare l'app. Il
// messaggio cita TABLET_APK_URL solo se impostata: nessun URL nel codice.

export type EsitoVersioneApp =
  | { ok: true }
  | { ok: false; risposta: NextResponse };

const STATO_APP_OBSOLETA = 426;
const VERSIONE_MINIMA_PREDEFINITA = 1;

function versioneMinima(): number {
  const grezza = process.env.TABLET_APP_VERSIONE_MINIMA;
  if (grezza === undefined || grezza.trim() === "") return VERSIONE_MINIMA_PREDEFINITA;
  const letta = leggiVersioneApp(grezza);
  if (letta === undefined) {
    console.warn("api-tablet TABLET_APP_VERSIONE_MINIMA non valida, uso il minimo predefinito");
    return VERSIONE_MINIMA_PREDEFINITA;
  }
  return letta;
}

function messaggioObsoleta(): string {
  const url = process.env.TABLET_APK_URL?.trim();
  return url
    ? `Versione dell'app non supportata. Scarica il nuovo APK da ${url} e installalo.`
    : "Versione dell'app non supportata. Chiedi il nuovo APK all'organizzatore.";
}

export function verificaVersioneApp(request: Request): EsitoVersioneApp {
  const versione = leggiVersioneApp(request.headers.get(HEADER_VERSIONE_APP));
  if (versione !== undefined && versione >= versioneMinima()) return { ok: true };

  console.warn(
    `api-tablet APP_OBSOLETA motivo=${versione === undefined ? "HEADER_ASSENTE_O_NON_VALIDO" : "SOTTO_IL_MINIMO"}`
  );
  return {
    ok: false,
    risposta: rispostaErroreTablet("APP_OBSOLETA", messaggioObsoleta(), STATO_APP_OBSOLETA),
  };
}

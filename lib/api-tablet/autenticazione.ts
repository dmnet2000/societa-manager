import "server-only";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

// Story 2.1 (epic tablet-collegato, referto elettronico tornei): unico punto
// di autenticazione dell'API del tablet (AD-13). L'app Capacitor manda
// "Authorization: Bearer <access_token>" ottenuto con supabase-js; qui il
// JWT si rivalida con getUser(jwt) - un client anon senza sessione basta,
// niente service-role. Le story 2.4 (Utente.attivo) e 2.6 estenderanno
// questa funzione, non i singoli Route Handler.
//
// Fail-closed: header assente o malformato, getUser fallito o lanciato,
// configurazione mancante -> sempre 401 NON_AUTENTICATO. I log contengono
// solo codici, mai il JWT ne' dati personali.

export type CodiceErroreTablet = "NON_AUTENTICATO";

export type EsitoAutenticazioneTablet =
  | { ok: true; utente: User }
  | { ok: false; risposta: NextResponse };

// Forma unica degli errori dell'API del tablet: { error: { code, message } }.
export function rispostaErroreTablet(
  code: CodiceErroreTablet,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

// Tre segmenti base64url separati da punti: un JWT. Tutto il resto e'
// malformato e non merita una chiamata a Supabase Auth.
const BEARER_JWT = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function estraiBearer(autorizzazione: string | null): string | null {
  if (!autorizzazione) return null;
  const corrispondenza = BEARER_JWT.exec(autorizzazione.trim());
  return corrispondenza?.[1] ?? null;
}

function nonAutenticato(motivo: string): EsitoAutenticazioneTablet {
  console.warn(`api-tablet NON_AUTENTICATO motivo=${motivo}`);
  return {
    ok: false,
    risposta: rispostaErroreTablet(
      "NON_AUTENTICATO",
      "Autenticazione mancante o non valida.",
      401
    ),
  };
}

export async function autenticaTablet(
  request: Request
): Promise<EsitoAutenticazioneTablet> {
  const jwt = estraiBearer(request.headers.get("authorization"));
  if (!jwt) return nonAutenticato("TOKEN_ASSENTE_O_MALFORMATO");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return nonAutenticato("CONFIGURAZIONE_MANCANTE");

  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data.user) return nonAutenticato("TOKEN_NON_VALIDO");
    return { ok: true, utente: data.user };
  } catch {
    return nonAutenticato("VERIFICA_FALLITA");
  }
}

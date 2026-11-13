import "server-only";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { eUtenteTablet } from "@/lib/ruoli";
import { rispostaErroreTablet } from "./risposta-errore";

// Story 2.1 (epic tablet-collegato, referto elettronico tornei): unico punto
// di autenticazione dell'API del tablet (AD-13). L'app Capacitor manda
// "Authorization: Bearer <access_token>" ottenuto con supabase-js; qui il
// JWT si rivalida con getUser(jwt) - un client anon senza sessione basta,
// niente service-role. La story 2.4 ha aggiunto il controllo su
// Utente.attivo; la 2.6 il ruolo TABLET (FORBIDDEN) e l'id Utente
// nell'esito. Il controllo "questa gara e' tua in questa epoca" sta in
// gare-tablet.ts (autorizzaGaraTablet), che parte da qui.
//
// Fail-closed: header assente o malformato, getUser fallito o lanciato,
// configurazione mancante, Utente assente o disattivato, Prisma che lancia
// -> sempre 401 NON_AUTENTICATO. Unica eccezione: un utente attivo ma senza
// ruolo TABLET riceve 403 FORBIDDEN (story 2.6). I log contengono
// solo codici, mai il JWT ne' dati personali.

// utenteId e' l'id della riga Utente (Prisma), quello delle assegnazioni
// (story 2.6); utente.id e' invece l'id di Supabase Auth.
export type EsitoAutenticazioneTablet =
  | { ok: true; utente: User; utenteId: string }
  | { ok: false; risposta: NextResponse };

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

// Story 2.6 (AD-12): un utente autenticato e attivo ma senza ruolo TABLET
// (es. un Admin che prova l'app con le sue credenziali) e' un problema di
// autorizzazione, non di autenticazione: 403 FORBIDDEN.
function nonTablet(): EsitoAutenticazioneTablet {
  console.warn("api-tablet FORBIDDEN motivo=RUOLO_NON_TABLET");
  return {
    ok: false,
    risposta: rispostaErroreTablet("FORBIDDEN", "Questo account non è un tablet.", 403),
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

    // Story 2.4 (AD-12): un tablet disattivato dall'Admin viene rifiutato a
    // ogni richiesta, anche con un token emesso prima della disattivazione.
    // Regola nostra, indipendente dal ban in Supabase Auth.
    // Story 2.6: nella stessa query anche id e ruoli (Prisma e' la fonte di
    // verita' dei ruoli, AD-11 di societa-manager).
    const utenteDb = await prisma.utente.findUnique({
      where: { supabaseAuthId: data.user.id },
      select: { id: true, attivo: true, ruoli: { select: { ruolo: true } } },
    });
    if (!utenteDb?.attivo) return nonAutenticato("UTENTE_NON_ATTIVO");
    if (!eUtenteTablet(utenteDb.ruoli.map((r) => r.ruolo))) return nonTablet();

    return { ok: true, utente: data.user, utenteId: utenteDb.id };
  } catch {
    return nonAutenticato("VERIFICA_FALLITA");
  }
}

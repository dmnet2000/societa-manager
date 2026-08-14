import "server-only";
import { createAdminClient } from "@/lib/auth-admin/client";
import {
  leggiConfigurazioneSocialFacebook,
  aggiornaStatoLetturaFacebook,
} from "@/lib/db-rls/configurazione-social-facebook";

// Story 18.13: estrae lo username/slug di una Pagina Facebook dal suo URL
// pubblico (gia' validato da urlPaginaFacebookValido, Story 18.5) - primo
// segmento di path, es. "https://www.facebook.com/miasocieta" -> "miasocieta".
// Fix code review: gestito anche il formato "facebook.com/profile.php?id=..."
// (comune per Pagine senza username personalizzato) - senza questo caso,
// l'id numerico nella query string veniva ignorato e si usava "profile.php"
// come slug, sempre sbagliato. Limite noto, non risolto qui: un URL
// "facebook.com/pages/Nome/12345" restituirebbe comunque "pages" (segmento
// sbagliato) - nessun AC copre questo formato, raro per Pagine con username
// personalizzato (il caso atteso qui).
export function estraiSlugPaginaFacebook(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const pathNormalizzato = parsed.pathname.replace(/\/+$/, "");
  const idProfilo = parsed.searchParams.get("id");
  if (pathNormalizzato === "/profile.php" && idProfilo) {
    return idProfilo;
  }
  const segmento = parsed.pathname.split("/").find((parte) => parte.length > 0);
  return segmento ?? null;
}

export type PostFacebook = {
  id: string;
  // Obbligatorio (non nullable): i post senza testo vengono scartati prima
  // di arrivare qui, vedi leggiUltimiPostFacebook.
  messaggio: string;
  immagineUrl: string | null;
  permalink: string;
  dataPubblicazione: string;
};

// v26.0 verificata dal vivo dall'utente il 2026-08-14 (generazione riuscita
// del Page Access Token e prima lettura post). Facebook deprecha le
// versioni vecchie a rotazione - da ricontrollare periodicamente.
const VERSIONE_GRAPH_API = "v26.0";
const LIMITE_POST = 10;
const TIMEOUT_MS = 8000;

type PostGraphApi = {
  id: string;
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  created_time?: string;
};

type RispostaGraphApi = {
  data?: PostGraphApi[];
  error?: { message: string };
};

// AC #3: questa funzione non lancia MAI (deviazione deliberata dalla
// convenzione generale del progetto "la query puo' lanciare, il chiamante
// fa .catch()" - vedi Dev Notes della storia "Perche' leggiUltimiPostFacebook
// non segue la convenzione .catch() del chiamante"): oltre a leggere, scrive
// anche lo stato ultimaLetturaOk/ultimoErrore come side-effect (AC #6),
// centralizzare il fail-soft qui e' piu' sicuro di delegarlo al chiamante.
export async function leggiUltimiPostFacebook(
  urlPaginaFacebook: string
): Promise<PostFacebook[]> {
  // Story 4.3/AD-11: client service-role, mai la sessione del Visitatore
  // anonimo (che non ne ha una) - mirror esatto di inviaEmail
  // (lib/email/invia-email.ts) per leggere un segreto RLS-protetto da un
  // contesto senza sessione utente.
  //
  // Fix code review: createAdminClient() era fuori dal try/catch - se
  // avesse lanciato (es. variabile d'ambiente mancante), l'eccezione
  // sarebbe uscita da questa funzione nonostante il commento "non lancia
  // mai" sopra, e app/page.tsx la chiama senza .catch() proprio perche' si
  // fida di quel contratto - avrebbe rotto l'intera home pubblica (AC #3).
  let supabase: ReturnType<typeof createAdminClient>;
  let configurazione;
  try {
    supabase = createAdminClient();
    configurazione = await leggiConfigurazioneSocialFacebook(supabase);
  } catch {
    return [];
  }

  if (!configurazione || !configurazione.accessToken) {
    return [];
  }

  const slug = estraiSlugPaginaFacebook(urlPaginaFacebook);
  if (!slug) {
    // Fix code review: prima nessun aggiornamento di stato in questo ramo -
    // un URL configurato malformato lasciava ultimaLetturaOk/ultimoErrore
    // invariati (magari ancora "ok" da una lettura precedente riuscita con
    // un URL diverso), senza alcun avviso diagnostico per l'Admin (AC #6).
    await aggiornaStatoSicuro(
      supabase,
      false,
      "URL Pagina Facebook non valido: impossibile ricavare l'identificativo della Pagina."
    );
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(`https://graph.facebook.com/${VERSIONE_GRAPH_API}/${slug}/posts`);
    url.searchParams.set("fields", "message,full_picture,permalink_url,created_time");
    url.searchParams.set("limit", String(LIMITE_POST));

    // Fix code review: il token viaggiava come query string (access_token=...),
    // piu' esposto a finire in URL loggati/echeggiati in messaggi di errore
    // che poi arrivano in chiaro in ultimoErrore (mostrato all'Admin) - header
    // Authorization Bearer, supportato dalle Graph API per le richieste
    // server-to-server, non lascia il token nell'URL della richiesta.
    const risposta = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${configurazione.accessToken}` },
    });
    const corpo = (await risposta.json()) as RispostaGraphApi;

    if (!risposta.ok || corpo.error) {
      const messaggioErrore = corpo.error?.message ?? `HTTP ${risposta.status}`;
      await aggiornaStatoSicuro(supabase, false, messaggioErrore);
      return [];
    }

    // AC #1: l'obiettivo esplicito di questa storia e' "che si legga tutto
    // il testo del post" - un post senza `message` (solo foto/video senza
    // didascalia) non ha nulla da mostrare in un carosello pensato per il
    // testo, viene scartato. Se questo filtro azzera l'intero elenco (una
    // Pagina che pubblica solo foto senza testo), la sezione sparisce come
    // da AC #3 (fail-soft) - comportamento intenzionale, non un bug.
    const post: PostFacebook[] = (corpo.data ?? [])
      .filter((p): p is PostGraphApi & { message: string } => Boolean(p.message))
      .map((p) => ({
        id: p.id,
        messaggio: p.message,
        immagineUrl: p.full_picture ?? null,
        permalink: p.permalink_url ?? "",
        dataPubblicazione: p.created_time ?? "",
      }));

    await aggiornaStatoSicuro(supabase, true, null);
    return post;
  } catch (err) {
    const messaggioErrore = err instanceof Error ? err.message : "Errore sconosciuto";
    await aggiornaStatoSicuro(supabase, false, messaggioErrore);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// Side-effect best-effort: un fallimento nello scrivere lo stato non deve
// MAI rompere la lettura dei post ne' la pagina che la chiama (fail-soft su
// fail-soft) - try/catch separato, nessuna propagazione.
async function aggiornaStatoSicuro(
  supabase: ReturnType<typeof createAdminClient>,
  ultimaLetturaOk: boolean,
  ultimoErrore: string | null
): Promise<void> {
  try {
    await aggiornaStatoLetturaFacebook(supabase, { ultimaLetturaOk, ultimoErrore });
  } catch {
    // Intenzionalmente ignorato - vedi commento sopra.
  }
}

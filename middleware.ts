import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getRouteDecision } from "@/lib/auth/route-guard";
import { parseRuoli } from "@/lib/ruoli";
import {
  SOGLIA_INATTIVITA_MS,
  ULTIMA_ATTIVITA_COOKIE,
  sessioneScaduta,
} from "@/lib/auth/sessione-inattiva";

// Next.js 16 rinomina "middleware.ts" in "proxy.ts" e fa girare il Proxy su
// runtime Node.js di default (non piu' configurabile su Edge - vedi
// node_modules/next/dist/docs/.../proxy.md). L'adapter di deploy
// @opennextjs/cloudflare pero' rifiuta il build se rileva un
// middleware/proxy Node.js ("Node.js middleware is not currently
// supported"). La vecchia convenzione "middleware.ts" e' ancora
// riconosciuta (solo deprecata, con warning in build) e permette
// "runtime: experimental-edge" - unica combinazione compatibile con
// Cloudflare, quindi qui si resta volutamente sulla convenzione legacy.
// Usa getUser() (non getSession()) perche' rivalida il JWT.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fail-closed: un errore imprevisto (es. Supabase Auth non raggiungibile)
  // e' trattato come utente non autenticato, non come crash del Proxy.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  // Story 9.8: timeout applicativo per inattivita' (1 ora) - le impostazioni
  // native Supabase richiedono il piano Pro (contro NFR6). "user = null" fa
  // si' che il resto della funzione tratti la richiesta come non autenticata,
  // riusando getRouteDecision/il redirect a LOGIN_PATH gia' esistenti sotto -
  // nessuna ramificazione di redirect duplicata.
  let sessioneTerminataPerInattivita = false;
  if (user) {
    const ultimaAttivita = request.cookies.get(ULTIMA_ATTIVITA_COOKIE)?.value;
    if (sessioneScaduta(ultimaAttivita, Date.now())) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error(err);
      }
      user = null;
      sessioneTerminataPerInattivita = true;
    } else {
      response.cookies.set(ULTIMA_ATTIVITA_COOKIE, String(Date.now()), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SOGLIA_INATTIVITA_MS / 1000,
      });
    }
  }

  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  const decision = getRouteDecision(
    request.nextUrl.pathname,
    !!user,
    ruoli
  );

  if (decision.action === "redirect") {
    const redirectResponse = NextResponse.redirect(new URL(decision.location, request.url));
    // Senza questo, i cookie scritti su "response" (incluso il signOut()
    // sopra, o un refresh del token Supabase avvenuto in getUser()) andrebbero
    // persi: questo ramo ritorna un oggetto NextResponse diverso da "response".
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    if (sessioneTerminataPerInattivita) {
      redirectResponse.cookies.delete(ULTIMA_ATTIVITA_COOKIE);
    }
    return redirectResponse;
  }

  // Story 8.1: espone il pathname corrente ai Server Component (es.
  // app/NavBar.tsx) via header di risposta - la root layout di Next.js App
  // Router non ha altrimenti accesso diretto al pathname lato server senza
  // attraversare il bordo client/server solo per questo scopo.
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

// Esclude asset statici e ottimizzazione immagini dal Proxy.
export const config = {
  runtime: "experimental-edge",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

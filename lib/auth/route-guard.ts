import type { Ruolo } from "@prisma/client";

export const LOGIN_PATH = "/accedi";
export const NON_AUTORIZZATO_PATH = "/non-autorizzato";

// Route pubbliche: accessibili senza sessione (login, registrazione).
export const PUBLIC_ROUTES = ["/accedi", "/registrati"];

// Mappa prefisso-rotta -> Ruoli ammessi. Aggiungere qui le rotte introdotte
// dalle prossime storie (Story 1.2+ estendera' con altri prefissi).
export const PROTECTED_ROUTES: { prefix: string; ruoliAmmessi: Ruolo[] }[] = [
  { prefix: "/admin", ruoliAmmessi: ["ADMIN"] },
  { prefix: "/import-atlete", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] },
  { prefix: "/precaricamento-allenatori", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] },
  {
    prefix: "/conferma-iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
  },
  { prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] },
  { prefix: "/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] },
  { prefix: "/slot", ruoliAmmessi: ["ADMIN", "DIRIGENTE"] },
  { prefix: "/mio-orario", ruoliAmmessi: ["ALLENATORE", "ATLETA"] },
  { prefix: "/orari", ruoliAmmessi: ["SEGRETERIA"] },
  { prefix: "/presenze", ruoliAmmessi: ["ALLENATORE"] },
  { prefix: "/storico-presenze", ruoliAmmessi: ["ALLENATORE", "ATLETA"] },
  { prefix: "/certificato-medico", ruoliAmmessi: ["GENITORE", "ATLETA"] },
  { prefix: "/notifiche", ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"] },
  {
    prefix: "/conferma-certificati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
  },
  { prefix: "/smtp", ruoliAmmessi: ["ADMIN"] },
  { prefix: "/logo", ruoliAmmessi: ["ADMIN"] },
  { prefix: "/vista-dirigente", ruoliAmmessi: ["DIRIGENTE"] },
  { prefix: "/permessi-certificati", ruoliAmmessi: ["ADMIN"] },
  { prefix: "/dati-fisici", ruoliAmmessi: ["ALLENATORE", "ATLETA"] },
];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string };

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Story 4.6: le rotte "/api/cron/*" sono Route Handler invocati da uno
// scheduler esterno (Cloudflare Cron Trigger), non pagine - un redirect
// verso /accedi non ha senso per un chiamante non-browser (es.
// app/api/cron/promemoria-certificati, che non ha mai una sessione Supabase
// Auth) e romperebbe l'endpoint (risposta 307 invece di JSON, scoperto in
// verifica dal vivo di questa storia). Ogni Route Handler sotto "/api/cron/"
// applica la propria autorizzazione internamente (qui: il segreto
// CRON_SECRET) - il Proxy non deve applicarvi la logica di sessione/Ruolo
// pensata per le pagine.
// Review fix: limitato a "/api/cron/" (non l'intero "/api/") - un'esenzione
// piu' ampia farebbe passare senza sessione anche un futuro Route Handler
// pensato per essere autenticato via Supabase Auth (es. una API JSON per il
// frontend), che dimenticasse di reimplementare da solo il controllo di
// Ruolo. Solo le rotte Cron, machine-to-machine per natura, hanno bisogno di
// questa esenzione.
function isRouteHandlerCron(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

function matchProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
}

// Funzione pura (nessuna dipendenza da Next.js) cosi' e' testabile in
// isolamento: proxy.ts si limita a leggere autenticazione/ruoli e applicare
// la decisione.
export function getRouteDecision(
  pathname: string,
  isAuthenticated: boolean,
  ruoli: Ruolo[]
): RouteDecision {
  if (isPublicRoute(pathname) || isRouteHandlerCron(pathname)) {
    return { action: "allow" };
  }

  if (!isAuthenticated) {
    return { action: "redirect", location: LOGIN_PATH };
  }

  const protectedRoute = matchProtectedRoute(pathname);
  if (protectedRoute) {
    const autorizzato = protectedRoute.ruoliAmmessi.some((r) =>
      ruoli.includes(r)
    );
    if (!autorizzato) {
      return { action: "redirect", location: NON_AUTORIZZATO_PATH };
    }
  }

  return { action: "allow" };
}

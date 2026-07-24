import type { Ruolo } from "@/generated/prisma/client";

export const LOGIN_PATH = "/accedi";
export const NON_AUTORIZZATO_PATH = "/non-autorizzato";

// Route pubbliche: accessibili senza sessione (login, registrazione).
export const PUBLIC_ROUTES = ["/accedi", "/registrati"];

// Mappa prefisso-rotta -> Ruoli ammessi. Aggiungere qui le rotte introdotte
// dalle prossime storie (Story 1.2+ estendera' con altri prefissi).
// "navLabel" (Story 8.1): stessa fonte di verita' usata sia per
// l'autorizzazione sia per le voci della barra di navigazione
// (lib/auth/voci-navigazione.ts) - evita una lista di voci duplicata e
// mantenuta a mano separatamente da questa.
export const PROTECTED_ROUTES: { prefix: string; ruoliAmmessi: Ruolo[]; navLabel: string }[] = [
  { prefix: "/admin", ruoliAmmessi: ["ADMIN"], navLabel: "Amministrazione" },
  { prefix: "/import-atlete", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Import atlete" },
  {
    prefix: "/precaricamento-allenatori",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Precaricamento allenatori",
  },
  {
    prefix: "/conferma-iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma iscrizioni",
  },
  { prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Palestre" },
  { prefix: "/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Gruppi" },
  { prefix: "/slot", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Slot" },
  { prefix: "/mio-orario", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Il mio orario" },
  { prefix: "/orari", ruoliAmmessi: ["SEGRETERIA"], navLabel: "Orari" },
  { prefix: "/presenze", ruoliAmmessi: ["ALLENATORE"], navLabel: "Presenze" },
  {
    prefix: "/storico-presenze",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    navLabel: "Storico presenze",
  },
  {
    prefix: "/certificato-medico",
    ruoliAmmessi: ["GENITORE", "ATLETA"],
    navLabel: "Certificato medico",
  },
  { prefix: "/notifiche", ruoliAmmessi: ["ALLENATORE", "DIRIGENTE"], navLabel: "Notifiche" },
  {
    prefix: "/conferma-certificati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma certificati",
  },
  { prefix: "/smtp", ruoliAmmessi: ["ADMIN"], navLabel: "Configurazione SMTP" },
  { prefix: "/logo", ruoliAmmessi: ["ADMIN"], navLabel: "Configurazione logo" },
  { prefix: "/vista-dirigente", ruoliAmmessi: ["DIRIGENTE"], navLabel: "Vista d'insieme" },
  { prefix: "/permessi-certificati", ruoliAmmessi: ["ADMIN"], navLabel: "Permessi certificati" },
  { prefix: "/dati-fisici", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Dati fisici" },
  {
    prefix: "/wizard-nuova-stagione",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Wizard nuova stagione",
  },
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

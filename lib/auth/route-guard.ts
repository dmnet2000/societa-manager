import type { Ruolo } from "@prisma/client";

export const LOGIN_PATH = "/accedi";
export const NON_AUTORIZZATO_PATH = "/non-autorizzato";

// Route pubbliche: accessibili senza sessione (login, registrazione).
// Story 9.11: /recupera-password e /reimposta-password sono per definizione
// raggiunte da un Utente senza sessione (o con una sessione appena scaduta),
// senza queste il Proxy le rediregerebbe a /accedi prima ancora di mostrare
// il form.
export const PUBLIC_ROUTES = [
  "/accedi",
  "/registrati",
  "/recupera-password",
  "/reimposta-password",
];

// Mappa prefisso-rotta -> Ruoli ammessi. Aggiungere qui le rotte introdotte
// dalle prossime storie (Story 1.2+ estendera' con altri prefissi).
// "navLabel" (Story 8.1): stessa fonte di verita' usata sia per
// l'autorizzazione sia per le voci della barra di navigazione
// (lib/auth/voci-navigazione.ts) - evita una lista di voci duplicata e
// mantenuta a mano separatamente da questa.
//
// Story 12.3: questo file (route-guard.ts) resta volutamente privo di
// qualunque dipendenza da Prisma/"server-only" - e' importato anche da
// lib/auth/voci-navigazione.ts, a sua volta importato da app/NavBarClient.tsx
// ("use client"). Un `import "server-only"` (transitivo tramite
// lib/auth/permessi-configurabili.ts -> lib/prisma.ts -> pg) qui romperebbe
// la build del bundle client (verificato dal vivo con `npm run build`:
// "Module not found: Can't resolve 'net'/'tls'" nel bundle browser). Per
// questo la logica che consulta rottaAbilitataPerRuolo (Story 12.2) vive nel
// nuovo file lib/auth/route-decision.ts, non qui - vedi quel file per
// isAutorizzato/getRouteDecision.
export const PROTECTED_ROUTES: {
  prefix: string;
  ruoliAmmessi: Ruolo[];
  navLabel: string;
  // Story 9.24: la rotta resta protetta (getRouteDecision non legge questo
  // campo) ma non compare nell'elenco di navigazione (filtraVociNavigazione,
  // lib/auth/voci-navigazione.ts) - usato per /smtp e /logo, raggiungibili
  // solo passando dalla pagina hub /impostazioni.
  nascostaDallaNav?: boolean;
  // Story 12.3 (Epic 12): se true, questa rotta e' stata migrata al sistema
  // di permessi configurabili (Story 12.1/12.2) - ruoliAmmessi diventa il
  // valore di fallback iniziale del seed (Story 12.1), non piu' consultato
  // direttamente da getRouteDecision (lib/auth/route-decision.ts), che
  // interroga invece rottaAbilitataPerRuolo per ciascun Ruolo dell'utente.
  // Nessuna voce di PROTECTED_ROUTES lo imposta ancora (nessuna rotta reale
  // migrata in questa story - la prima e' Story 12.4,
  // /precaricamento-allenatori).
  permessiConfigurabili?: boolean;
}[] = [
  { prefix: "/admin", ruoliAmmessi: ["ADMIN"], navLabel: "Amministrazione" },
  { prefix: "/import-atlete", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Import atlete" },
  {
    // Story 9.22: solo ADMIN - accesso Dirigente rimosso su richiesta
    // esplicita dell'utente (soluzione temporanea, vedi Epic 12 futuro).
    prefix: "/precaricamento-allenatori",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Precaricamento allenatori",
  },
  {
    prefix: "/conferma-iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma iscrizioni",
  },
  { prefix: "/palestre", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Palestre" },
  { prefix: "/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Gruppi" },
  {
    prefix: "/i-miei-gruppi",
    ruoliAmmessi: ["ALLENATORE"],
    navLabel: "I miei Gruppi",
  },
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
  { prefix: "/impostazioni", ruoliAmmessi: ["ADMIN"], navLabel: "Impostazioni" },
  {
    prefix: "/smtp",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Configurazione SMTP",
    nascostaDallaNav: true,
  },
  {
    prefix: "/logo",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Configurazione logo",
    nascostaDallaNav: true,
  },
  { prefix: "/vista-dirigente", ruoliAmmessi: ["DIRIGENTE"], navLabel: "Vista d'insieme" },
  {
    // Story 9.26: specchio di /vista-dirigente ma scoped ai Gruppi propri
    // dell'Allenatore - stessa navLabel (Ruoli mutuamente esclusivi nel
    // caso comune, caso limite ADMIN+ALLENATORE accettato, vedi story file).
    prefix: "/vista-allenatore",
    ruoliAmmessi: ["ALLENATORE"],
    navLabel: "Vista d'insieme",
  },
  { prefix: "/permessi-certificati", ruoliAmmessi: ["ADMIN"], navLabel: "Permessi certificati" },
  { prefix: "/dati-fisici", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Dati fisici" },
  {
    prefix: "/wizard-nuova-stagione",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Wizard nuova stagione",
  },
  {
    prefix: "/il-mio-profilo",
    ruoliAmmessi: ["ALLENATORE", "ATLETA"],
    navLabel: "Il mio profilo",
  },
  {
    prefix: "/campionati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE"],
    navLabel: "Campionati",
  },
  {
    // Story 10.5: estesa ad ATLETA/GENITORE (sola lettura, gating UI in
    // page.tsx) - stesso pattern gia' usato per /certificato-medico.
    prefix: "/partite",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "ALLENATORE", "ATLETA", "GENITORE"],
    navLabel: "Partite",
  },
  {
    // Story 12.1: pagina Admin-only di gestione dei permessi configurabili
    // per rotta (Epic 12) - ADMIN sempre escluso dalle righe configurabili
    // stesse (accesso pieno hardcoded), quindi questa rotta e' anch'essa
    // ADMIN-only, stesso trattamento di /permessi-certificati.
    prefix: "/permessi-accesso",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Permessi di accesso",
  },
];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string };

// Story 12.3: esportata (era privata) - lib/auth/route-decision.ts la
// riusa per non duplicare la logica di route pubbliche.
export function isPublicRoute(pathname: string): boolean {
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
// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function isRouteHandlerCron(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

// /api/health (2026-07-25): endpoint di diagnostica (DB/Supabase Auth
// raggiungibili) usato per verificare la produzione senza passare dal
// login - deve restare raggiungibile anche quando l'autenticazione stessa
// e' rotta, altrimenti non serve al suo scopo. Nessun dato sensibile
// esposto (solo stato/latenza, vedi app/api/health/route.ts), stesso
// principio di isRouteHandlerCron sopra.
// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function isRouteHandlerHealth(pathname: string): boolean {
  return pathname === "/api/health";
}

// Story 12.3: esportata (era privata), stesso motivo di isPublicRoute sopra.
export function matchProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
}

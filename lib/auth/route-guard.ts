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
  // direttamente da getRouteDecision (lib/auth/route-decision.ts) ne' da
  // requireRuolo (lib/auth/require-ruolo.ts, Story 12.4), che interrogano
  // invece rottaAbilitataPerRuolo per ciascun Ruolo dell'utente. Prima (e per
  // ora unica) voce migrata: /precaricamento-allenatori, Story 12.4.
  permessiConfigurabili?: boolean;
  // Story 15.1 (Epic 15): se valorizzato, questa rotta compare come voce
  // figlia di un sotto-menu espandibile invece che come voce diretta -
  // "gruppo" e' l'etichetta della voce padre (es. futura "Orari/Palestre"),
  // condivisa da piu' righe di questo array. Infrastruttura pura: nessuna
  // riga qui sotto lo valorizza ancora, la vera applicazione a rotte reali
  // arriva con Story 15.2/15.3/15.4 (stesso principio "fondazione senza
  // consumer reale" gia' seguito in Story 12.1/12.2 per i permessi
  // configurabili). Non consultato da getRouteDecision/requireRuolo -
  // riguarda solo la presentazione in lib/auth/voci-navigazione.ts, mai
  // l'autorizzazione.
  gruppo?: string;
}[] = [
  {
    // Story 15.3 (Epic 15): le quattro rotte raggruppate sotto "Atleti"
    // sono state spostate qui, adiacenti, nell'ordine "Import atlete,
    // Conferma iscrizioni, Conferma certificati, Conferma tesseramenti"
    // (stesso ordine di epics.md) cosi' raggruppaVociNavigazione (che
    // preserva l'ordine di dichiarazione) produce le figlie del gruppo
    // nello stesso ordine - lezione applicata direttamente dalla code
    // review di Story 15.2 (dove l'ordine sbagliato fu scoperto solo in
    // quella review, non anticipato in fase di scrittura).
    prefix: "/import-atlete",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Import atlete",
    gruppo: "Atleti",
  },
  {
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti").
    prefix: "/conferma-iscrizioni",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma iscrizioni",
    gruppo: "Atleti",
  },
  {
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti") -
    // spostata qui da una posizione piu' in basso nell'array (era vicina a
    // /notifiche) per stare adiacente alle altre tre rotte dello stesso
    // gruppo.
    prefix: "/conferma-certificati",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
    navLabel: "Conferma certificati",
    gruppo: "Atleti",
  },
  {
    // Story 13.1 (Epic 13): a differenza di /conferma-iscrizioni, Segreteria
    // e' esplicitamente esclusa - solo Admin/Dirigente possono confermare il
    // Tesseramento.
    // Story 15.3: stesso gruppo di /import-atlete sopra ("Atleti").
    prefix: "/conferma-tesseramenti",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Conferma tesseramenti",
    gruppo: "Atleti",
  },
  {
    // Story 15.2 (Epic 15): prima applicazione reale del campo "gruppo"
    // introdotto come infrastruttura pura da Story 15.1 - raggruppa con
    // /palestre sotto la voce di menu "Orari/Palestre". Nessun cambio a
    // ruoliAmmessi/navLabel/prefix, l'autorizzazione resta invariata.
    // Review fix: dichiarata PRIMA di /palestre (non dopo) cosi' l'ordine
    // delle figlie nel gruppo (raggruppaVociNavigazione preserva l'ordine
    // di iterazione) corrisponde all'ordine dell'etichetta padre
    // "Orari/Palestre" anche nel caso raro di un Utente con entrambi i
    // Ruoli Segreteria e Admin/Dirigente.
    prefix: "/orari",
    ruoliAmmessi: ["SEGRETERIA"],
    navLabel: "Orari",
    gruppo: "Orari/Palestre",
  },
  {
    // Story 15.2: stesso gruppo di /orari sopra ("Orari/Palestre").
    prefix: "/palestre",
    ruoliAmmessi: ["ADMIN", "DIRIGENTE"],
    navLabel: "Palestre",
    gruppo: "Orari/Palestre",
  },
  { prefix: "/gruppi", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Gruppi" },
  {
    prefix: "/i-miei-gruppi",
    ruoliAmmessi: ["ALLENATORE"],
    navLabel: "I miei Gruppi",
  },
  { prefix: "/slot", ruoliAmmessi: ["ADMIN", "DIRIGENTE"], navLabel: "Slot" },
  { prefix: "/mio-orario", ruoliAmmessi: ["ALLENATORE", "ATLETA"], navLabel: "Il mio orario" },
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
    // Story 15.4 (Epic 15): le tre rotte raggruppate sotto "Accounting"
    // sono state spostate qui, in fondo all'intero array - a differenza di
    // Story 15.2/15.3 (dove bastava rendere le rotte adiacenti tra loro),
    // qui AC #1 richiede esplicitamente che "Accounting" sia l'ULTIMA voce
    // del menu: raggruppaVociNavigazione (Story 15.1) posiziona il nodo
    // gruppo all'indice della PRIMA rotta del gruppo incontrata, quindi la
    // sola adiacenza non basta, serve la posizione finale dell'array.
    // navLabel "Amministrazione" NON rinominato: l'etichetta della voce
    // padre del gruppo viene dal valore di "gruppo" stesso ("Accounting"),
    // non dal navLabel di /admin - che resta l'etichetta della sua figlia.
    prefix: "/admin",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Amministrazione",
    gruppo: "Accounting",
  },
  {
    // Story 9.22: solo ADMIN - accesso Dirigente rimosso su richiesta
    // esplicita dell'utente (soluzione temporanea, sostituita da Story 12.4).
    // Story 12.4: prima rotta reale migrata al sistema di permessi
    // configurabili (PoC end-to-end dell'Epic 12) - ruoliAmmessi resta
    // scritto come fallback storico ma non e' piu' consultato da
    // isAutorizzato (lib/auth/route-decision.ts) ne' da requireRuolo quando
    // gli viene passata questa rotta: l'autorizzazione reale (pagina e
    // Server Action) passa ora da rottaAbilitataPerRuolo/permessi_rotte.
    // Nessuna riga esiste ancora per questa rotta nel seed di Story 12.1
    // (era ADMIN-only) - comportamento invariato per costruzione (fail-closed
    // su ogni Ruolo diverso da ADMIN, identico a oggi) finche' un Admin non
    // abilita esplicitamente un altro Ruolo da /permessi-accesso.
    // Story 15.4: stesso gruppo di /admin sopra ("Accounting").
    prefix: "/precaricamento-allenatori",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Precaricamento allenatori",
    permessiConfigurabili: true,
    gruppo: "Accounting",
  },
  {
    // Story 12.1: pagina Admin-only di gestione dei permessi configurabili
    // per rotta (Epic 12) - ADMIN sempre escluso dalle righe configurabili
    // stesse (accesso pieno hardcoded), quindi questa rotta e' anch'essa
    // ADMIN-only, stesso trattamento di /permessi-certificati (quest'ultima
    // NON fa parte di "Accounting" - AC #3, non menzionata nella richiesta
    // originale nonostante la somiglianza di nome, resta dov'e').
    // Story 15.4: stesso gruppo di /admin sopra ("Accounting").
    prefix: "/permessi-accesso",
    ruoliAmmessi: ["ADMIN"],
    navLabel: "Permessi di accesso",
    gruppo: "Accounting",
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

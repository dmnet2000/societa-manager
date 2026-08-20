import "server-only";
import type { Ruolo } from "@prisma/client";
import { rottaAbilitataPerRuolo } from "@/lib/auth/permessi-configurabili";
import { paginaPubblicaEsistePerSlug } from "@/lib/auth/pagine-pubbliche-slug-cache";
import {
  LOGIN_PATH,
  NON_AUTORIZZATO_PATH,
  PROTECTED_ROUTES,
  isPublicRoute,
  isRouteHandlerCron,
  isRouteHandlerHealth,
  matchProtectedRoute,
  rottaRiservata,
  type RouteDecision,
} from "@/lib/auth/route-guard";

// Review fix (Blind Hunter): tipo derivato da PROTECTED_ROUTES invece di
// ridigitato a mano - se il tipo reale in route-guard.ts cambia, questo
// resta automaticamente sincronizzato (prima, una copia strutturale
// indipendente avrebbe potuto divergere silenziosamente).
type RottaProtetta = (typeof PROTECTED_ROUTES)[number];

// Story 12.3: separata da route-guard.ts (che resta senza "server-only" -
// e' importato anche dal bundle client tramite
// lib/auth/voci-navigazione.ts -> app/NavBarClient.tsx, verificato dal vivo
// con `npm run build`: un import statico di permessi-configurabili.ts
// direttamente in route-guard.ts trascina lib/prisma.ts -> pg nel bundle
// browser e rompe la build). Questo file consulta rottaAbilitataPerRuolo
// (Story 12.2) e va importato solo da codice server (middleware.ts).
export type { RouteDecision };

// Esportata (non interna a getRouteDecision) apposta per essere testabile
// con un oggetto rotta sintetico, senza dover mutare l'array reale
// PROTECTED_ROUTES (che deve restare invariato in questa story - nessuna
// rotta reale e' ancora migrata, Story 12.4). Decompone "quale rotta ha
// fatto match" (matchProtectedRoute, invariata) da "quel Ruolo e'
// autorizzato per quella rotta" (qui) - il path statico resta identico
// bit-per-bit, il path migrato eredita gratuitamente il
// fail-closed-su-errore-DB gia' garantito da rottaAbilitataPerRuolo
// (Story 12.2, review fix).
export async function isAutorizzato(
  route: RottaProtetta,
  ruoli: Ruolo[]
): Promise<boolean> {
  if (!route.permessiConfigurabili) {
    return route.ruoliAmmessi.some((r) => ruoli.includes(r));
  }

  // Rotta migrata: basta che UN Ruolo dell'utente sia abilitato, stesso
  // principio ".some()" del path statico sopra.
  const risultati = await Promise.all(
    ruoli.map((ruolo) => rottaAbilitataPerRuolo(route.prefix, ruolo))
  );
  return risultati.some(Boolean);
}

// Story 12.3: diventata async per poter consultare rottaAbilitataPerRuolo
// (Story 12.2) sulle rotte migrate - decisione presa con l'utente in fase di
// creazione della storia (middleware.ts e' gia' async dalla Story 9.8,
// nessun ostacolo ad awaitarla). Nessuna rotta reale e' ancora migrata in
// questa story: il comportamento per ogni rotta esistente resta identico.
export async function getRouteDecision(
  pathname: string,
  isAuthenticated: boolean,
  ruoli: Ruolo[]
): Promise<RouteDecision> {
  if (
    isPublicRoute(pathname) ||
    isRouteHandlerCron(pathname) ||
    isRouteHandlerHealth(pathname)
  ) {
    return { action: "allow" };
  }

  // Story 19.9 (Epic 19, Ruolo Site Manager): una PaginaPubblica esistente e'
  // sempre pubblica, indipendentemente da autenticazione/Ruolo - stesso
  // principio delle voci statiche di PUBLIC_ROUTES sopra, ma risolta a
  // runtime (lo slug e' configurato da un Site Manager/Admin dopo il
  // deploy, non elencabile in anticipo in un array statico). Senza questo
  // controllo un Visitatore anonimo che apre un URL nuovo verrebbe
  // reindirizzato a /accedi PRIMA di raggiungere app/[...slug]/page.tsx -
  // esattamente lo stesso bug gia' corretto per /squadre,/calendario,/staff,
  // /contatti in Story 18.7 (vedi commento su PUBLIC_ROUTES in
  // lib/auth/route-guard.ts), qui impossibile da correggere con la stessa
  // tecnica (lista statica) perche' lo slug non e' noto in anticipo.
  // rottaRiservata(pathname), a questo punto del flusso (isPublicRoute gia'
  // escluso sopra), equivale a "sotto /app o /api" - non vale la pena
  // interrogare il database per un pathname che non potra' mai essere una
  // PaginaPubblica (rottaRiservata la rifiuta gia' in creazione/modifica,
  // Story 19.7/19.10).
  // Code review: "!isAuthenticated &&" aggiunto in testa - un Utente gia'
  // autenticato attraversa comunque invariato verso il ramo sotto (nessuna
  // restrizione su un pathname sconosciuto per chi ha gia' una sessione,
  // stesso comportamento di sempre), quindi interrogare
  // paginaPubblicaEsistePerSlug per lui era un round-trip cache/DB sprecato
  // il cui risultato non cambiava mai l'esito finale.
  if (
    !isAuthenticated &&
    !rottaRiservata(pathname) &&
    (await paginaPubblicaEsistePerSlug(pathname))
  ) {
    return { action: "allow" };
  }

  if (!isAuthenticated) {
    return { action: "redirect", location: LOGIN_PATH };
  }

  const protectedRoute = matchProtectedRoute(pathname);
  if (protectedRoute) {
    const autorizzato = await isAutorizzato(protectedRoute, ruoli);
    if (!autorizzato) {
      return { action: "redirect", location: NON_AUTORIZZATO_PATH };
    }
  }

  return { action: "allow" };
}

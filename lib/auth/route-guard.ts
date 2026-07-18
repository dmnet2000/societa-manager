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
];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string };

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
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
  if (isPublicRoute(pathname)) {
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

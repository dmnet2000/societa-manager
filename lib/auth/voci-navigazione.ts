import type { Ruolo } from "@prisma/client";
import { PROTECTED_ROUTES } from "./route-guard";

// Story 15.1 (Epic 15): union discriminata - una voce diretta o un gruppo
// espandibile con figlie (raggruppate tramite il nuovo campo "gruppo" di
// PROTECTED_ROUTES). Nessuna riga reale usa ancora "gruppo" in questa
// storia (infrastruttura pura) - filtraVociNavigazione produce quindi oggi
// solo nodi "voce" con i dati reali del progetto, il tipo "gruppo" e' gia'
// pronto per Story 15.2/15.3/15.4.
export type VoceSingola = { tipo: "voce"; href: string; label: string };
export type VoceGruppo = {
  tipo: "gruppo";
  label: string;
  figlie: { href: string; label: string }[];
};
export type VoceNavigazione = VoceSingola | VoceGruppo;

type RouteConfig = (typeof PROTECTED_ROUTES)[number];

// Story 15.1: logica di raggruppamento estratta come funzione pura che
// riceve l'array di route esplicitamente - testabile con dati sintetici
// senza mutare l'array reale PROTECTED_ROUTES (stesso principio gia' usato
// per isAutorizzato/rottaAbilitataMock in Story 12.2/12.3, "testabile con
// una rotta sintetica senza mutare l'array reale"). filtraVociNavigazione
// sotto resta il punto di ingresso reale usato da app/NavBar.tsx, un
// sottile wrapper su PROTECTED_ROUTES.
//
// Le rotte filtrate che condividono lo stesso "gruppo" vengono raccolte in
// un unico nodo "gruppo", posizionato all'indice della PRIMA rotta di quel
// gruppo incontrata (ordine stabile/prevedibile, non riordinato alla
// fine). Un gruppo la cui nessuna figlia sopravvive al filtro per Ruolo
// non produce mai un nodo vuoto: il nodo viene creato solo quando una
// prima figlia effettivamente sopravvive.
export function raggruppaVociNavigazione(
  routes: RouteConfig[],
  ruoli: Ruolo[]
): VoceNavigazione[] {
  const filtrate = routes.filter(
    (route) =>
      !route.nascostaDallaNav && route.ruoliAmmessi.some((r) => ruoli.includes(r))
  );

  const risultato: VoceNavigazione[] = [];
  const indiceGruppo = new Map<string, number>();

  for (const route of filtrate) {
    const figlia = { href: route.prefix, label: route.navLabel };

    if (!route.gruppo) {
      risultato.push({ tipo: "voce", ...figlia });
      continue;
    }

    const idx = indiceGruppo.get(route.gruppo);
    if (idx === undefined) {
      indiceGruppo.set(route.gruppo, risultato.length);
      risultato.push({ tipo: "gruppo", label: route.gruppo, figlie: [figlia] });
    } else {
      const nodo = risultato[idx];
      if (nodo.tipo === "gruppo") {
        nodo.figlie.push(figlia);
      }
    }
  }

  return risultato;
}

// Story 8.1 (AC #2/#3): filtra PROTECTED_ROUTES (stessa fonte di verita'
// gia' usata per l'autorizzazione, lib/auth/route-guard.ts) tenendo solo le
// voci il cui ruoliAmmessi interseca i Ruoli dell'Utente. Nessuna deduplica
// esplicita necessaria: ogni prefisso compare una sola volta in
// PROTECTED_ROUTES per costruzione, quindi un Utente con piu' Ruoli vede
// automaticamente l'unione senza ripetizioni.
export function filtraVociNavigazione(ruoli: Ruolo[]): VoceNavigazione[] {
  return raggruppaVociNavigazione(PROTECTED_ROUTES, ruoli);
}

// Story 9.24 (review fix): /smtp e /logo hanno nascostaDallaNav:true - non
// compaiono piu' come voci dirette, ma senza questa mappa nessuna voce
// risulterebbe evidenziata visitandole (raggiunte solo tramite la pagina hub
// /impostazioni), perdendo l'orientamento "dove mi trovo" gia' garantito per
// ogni altra pagina dell'app.
const VOCI_FIGLIE_NASCOSTE: Record<string, string[]> = {
  "/impostazioni": ["/smtp", "/logo"],
};

// Story 9.10 (Review fix): estratta come funzione pura testabile - va
// chiamata lato client (usePathname() in NavBarClient.tsx), non lato server
// (il layout radice resta nella Client Cache di Next.js e non si
// ri-esegue ad ogni navigazione, vedi Story 9.7/9.10).
export function isVoceAttiva(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  const figlie = VOCI_FIGLIE_NASCOSTE[href] ?? [];
  return figlie.some(
    (figlia) => pathname === figlia || pathname.startsWith(`${figlia}/`)
  );
}

// Story 15.1 (AC #2): usata sia per decidere l'espansione di default di un
// gruppo (NavBarClient.tsx) sia per evidenziare la voce padre stessa
// quando il pathname corrente e' su una delle sue figlie - riusa
// isVoceAttiva per ogni figlia invece di duplicarne la logica.
export function isGruppoAttivo(pathname: string, gruppo: VoceGruppo): boolean {
  return gruppo.figlie.some((figlia) => isVoceAttiva(pathname, figlia.href));
}

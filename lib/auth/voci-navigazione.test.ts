import type { Ruolo } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  filtraVociNavigazione,
  isGruppoAttivo,
  isVoceAttiva,
  raggruppaVociNavigazione,
  type VoceGruppo,
} from "./voci-navigazione";

// Story 15.1: filtraVociNavigazione ora restituisce una union discriminata
// (voce | gruppo) - con i dati REALI di PROTECTED_ROUTES nessuna riga ha
// ancora "gruppo" valorizzato in questa storia (infrastruttura pura, vedi
// Dev Notes della story), quindi ogni nodo qui e' sempre tipo:"voce". Gli
// href si estraggono filtrando esplicitamente su tipo:"voce" invece di
// assumerlo implicitamente come prima di questa storia.
function hrefVoci(voci: ReturnType<typeof filtraVociNavigazione>): string[] {
  return voci.filter((v) => v.tipo === "voce").map((v) => v.href);
}

describe("filtraVociNavigazione", () => {
  it("restituisce array vuoto per ruoli vuoti", () => {
    expect(filtraVociNavigazione([])).toEqual([]);
  });

  it("mostra solo le voci ammesse al Ruolo Allenatore", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE"]));
    expect(href).toEqual(
      expect.arrayContaining([
        "/mio-orario",
        "/presenze",
        "/storico-presenze",
        "/notifiche",
        "/dati-fisici",
      ])
    );
    // Nessuna voce Admin-only o Atleta-only-non-condivisa
    expect(href).not.toContain("/admin");
    expect(href).not.toContain("/certificato-medico");
  });

  it("unisce le voci di Utenti con più Ruoli, senza duplicati", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE", "DIRIGENTE"]));
    expect(href).toEqual(expect.arrayContaining(["/presenze", "/vista-dirigente"]));
    expect(new Set(href).size).toBe(href.length);
  });

  it("un Admin vede tutte le voci Admin-ammesse", () => {
    const href = hrefVoci(filtraVociNavigazione(["ADMIN"]));
    expect(href).toEqual(
      expect.arrayContaining([
        "/admin",
        "/import-atlete",
        "/precaricamento-allenatori",
        "/conferma-iscrizioni",
        "/palestre",
        "/gruppi",
        "/slot",
        "/conferma-certificati",
        "/impostazioni",
        "/permessi-certificati",
        "/wizard-nuova-stagione",
      ])
    );
  });

  // Story 9.24: /smtp e /logo restano rotte accessibili (route-guard
  // invariata) ma non devono piu' comparire come voci dirette in barra -
  // raggiungibili solo passando dalla pagina hub /impostazioni.
  it("un Admin non vede più /smtp e /logo come voci dirette, nonostante l'accesso resti consentito (Story 9.24)", () => {
    const href = hrefVoci(filtraVociNavigazione(["ADMIN"]));
    expect(href).not.toContain("/smtp");
    expect(href).not.toContain("/logo");
  });

  it("ogni voce ha un href e una label non vuoti", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    for (const voce of voci) {
      expect(voce.tipo).toBe("voce");
      if (voce.tipo === "voce") {
        expect(voce.href).toMatch(/^\//);
        expect(voce.label.length).toBeGreaterThan(0);
      }
    }
  });

  // Story 15.1: con i dati reali del progetto nessuna riga ha "gruppo"
  // valorizzato in questa storia - la vera prova del raggruppamento arriva
  // dai test di raggruppaVociNavigazione sotto (dati sintetici) e da Story
  // 15.2/15.3/15.4 (dati reali).
  it("nessun nodo gruppo con i dati reali del progetto (infrastruttura pura in questa storia)", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    expect(voci.every((v) => v.tipo === "voce")).toBe(true);
  });

  // Review fix: i test sopra usano expect.arrayContaining, che ignora
  // l'ordine - una regressione d'ordine introdotta dal nuovo ciclo `for` di
  // raggruppaVociNavigazione non verrebbe rilevata. Uguaglianza esatta
  // (ordine incluso) per un Ruolo reale, verificata a mano contro l'ordine
  // attuale di PROTECTED_ROUTES - se questo test rompe dopo aver
  // riordinato/aggiunto una rotta ammessa per ALLENATORE, aggiornare
  // l'elenco atteso, non ignorare il fallimento.
  it("mantiene l'ordine di PROTECTED_ROUTES per un Ruolo reale (Allenatore)", () => {
    const href = hrefVoci(filtraVociNavigazione(["ALLENATORE"]));
    expect(href).toEqual([
      "/i-miei-gruppi",
      "/mio-orario",
      "/presenze",
      "/storico-presenze",
      "/notifiche",
      "/vista-allenatore",
      "/dati-fisici",
      "/il-mio-profilo",
      "/campionati",
      "/partite",
    ]);
  });
});

// Story 15.1: dati sintetici, non l'array reale PROTECTED_ROUTES - stesso
// principio gia' usato per isAutorizzato/rottaAbilitataMock in Story
// 12.2/12.3.
function routeSintetica(overrides: {
  prefix: string;
  ruoliAmmessi: Ruolo[];
  navLabel: string;
  gruppo?: string;
  nascostaDallaNav?: boolean;
}) {
  return overrides;
}

describe("raggruppaVociNavigazione", () => {
  it("raggruppa le rotte che condividono lo stesso gruppo in un unico nodo, in ordine di prima apparizione", () => {
    const routes = [
      routeSintetica({ prefix: "/a", ruoliAmmessi: ["ADMIN"], navLabel: "A" }),
      routeSintetica({
        prefix: "/b1",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "B1",
        gruppo: "Gruppo B",
      }),
      routeSintetica({ prefix: "/c", ruoliAmmessi: ["ADMIN"], navLabel: "C" }),
      routeSintetica({
        prefix: "/b2",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "B2",
        gruppo: "Gruppo B",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ADMIN"]);

    expect(voci).toEqual([
      { tipo: "voce", href: "/a", label: "A" },
      {
        tipo: "gruppo",
        label: "Gruppo B",
        figlie: [
          { href: "/b1", label: "B1" },
          { href: "/b2", label: "B2" },
        ],
      },
      { tipo: "voce", href: "/c", label: "C" },
    ]);
  });

  it("un gruppo la cui nessuna figlia sopravvive al filtro per Ruolo non produce un nodo vuoto", () => {
    const routes = [
      routeSintetica({
        prefix: "/solo-admin",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Solo Admin",
        gruppo: "Gruppo Admin",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ALLENATORE"]);

    expect(voci).toEqual([]);
  });

  it("un gruppo mostra solo le figlie a cui il Ruolo ha accesso, non tutte quelle configurate", () => {
    const routes = [
      routeSintetica({
        prefix: "/tutti",
        ruoliAmmessi: ["ADMIN", "SEGRETERIA"],
        navLabel: "Tutti",
        gruppo: "Gruppo Misto",
      }),
      routeSintetica({
        prefix: "/solo-admin",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Solo Admin",
        gruppo: "Gruppo Misto",
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["SEGRETERIA"]);

    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Gruppo Misto",
        figlie: [{ href: "/tutti", label: "Tutti" }],
      },
    ]);
  });

  it("rispetta nascostaDallaNav anche dentro un gruppo", () => {
    const routes = [
      routeSintetica({
        prefix: "/visibile",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Visibile",
        gruppo: "Gruppo",
      }),
      routeSintetica({
        prefix: "/nascosta",
        ruoliAmmessi: ["ADMIN"],
        navLabel: "Nascosta",
        gruppo: "Gruppo",
        nascostaDallaNav: true,
      }),
    ];

    const voci = raggruppaVociNavigazione(routes, ["ADMIN"]);

    expect(voci).toEqual([
      {
        tipo: "gruppo",
        label: "Gruppo",
        figlie: [{ href: "/visibile", label: "Visibile" }],
      },
    ]);
  });
});

describe("isGruppoAttivo", () => {
  const gruppo: VoceGruppo = {
    tipo: "gruppo",
    label: "Gruppo",
    figlie: [
      { href: "/orari", label: "Orari" },
      { href: "/palestre", label: "Palestre" },
    ],
  };

  it("è attivo quando il pathname coincide con una figlia", () => {
    expect(isGruppoAttivo("/palestre", gruppo)).toBe(true);
  });

  it("è attivo quando il pathname è una sotto-pagina di una figlia", () => {
    expect(isGruppoAttivo("/palestre/1", gruppo)).toBe(true);
  });

  it("non è attivo per un pathname estraneo a tutte le figlie", () => {
    expect(isGruppoAttivo("/admin", gruppo)).toBe(false);
  });

  it("non è attivo per un gruppo senza figlie", () => {
    expect(isGruppoAttivo("/qualunque", { tipo: "gruppo", label: "Vuoto", figlie: [] })).toBe(
      false
    );
  });
});

// Story 9.10 (Review][Patch): estratta come funzione pura testabile - prima
// viveva inline dentro il .map() di NavBarClient.tsx, non testabile in
// isolamento senza montare React. Proprio uno stato derivato non testato e'
// stata la causa della regressione (voce attiva mai aggiornata) che ha
// originato questa storia.
describe("isVoceAttiva", () => {
  it("e' attiva quando il pathname coincide esattamente con l'href", () => {
    expect(isVoceAttiva("/palestre", "/palestre")).toBe(true);
  });

  it("e' attiva quando il pathname e' una sotto-pagina dell'href", () => {
    expect(isVoceAttiva("/palestre/1", "/palestre")).toBe(true);
  });

  it("non e' attiva per un pathname diverso", () => {
    expect(isVoceAttiva("/admin", "/palestre")).toBe(false);
  });

  it("non e' attiva per un href che e' solo prefisso testuale senza separatore '/'", () => {
    // "/palestreX" non e' una sotto-pagina di "/palestre" - deve richiedere
    // il separatore "/" esplicito, non un semplice startsWith su tutta la
    // stringa.
    expect(isVoceAttiva("/palestreX", "/palestre")).toBe(false);
  });

  it("e' attiva per /impostazioni quando il pathname e' /smtp o /logo, nonostante non compaiano piu' come voci dirette (review fix Story 9.24)", () => {
    expect(isVoceAttiva("/smtp", "/impostazioni")).toBe(true);
    expect(isVoceAttiva("/logo", "/impostazioni")).toBe(true);
    expect(isVoceAttiva("/logo/qualcosa", "/impostazioni")).toBe(true);
  });

  it("non e' attiva per /impostazioni su un pathname estraneo", () => {
    expect(isVoceAttiva("/admin", "/impostazioni")).toBe(false);
  });
});

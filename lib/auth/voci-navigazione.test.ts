import { describe, expect, it } from "vitest";
import { filtraVociNavigazione, isVoceAttiva } from "./voci-navigazione";

describe("filtraVociNavigazione", () => {
  it("restituisce array vuoto per ruoli vuoti", () => {
    expect(filtraVociNavigazione([])).toEqual([]);
  });

  it("mostra solo le voci ammesse al Ruolo Allenatore", () => {
    const voci = filtraVociNavigazione(["ALLENATORE"]);
    const href = voci.map((v) => v.href);
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
    const voci = filtraVociNavigazione(["ALLENATORE", "DIRIGENTE"]);
    const href = voci.map((v) => v.href);
    expect(href).toEqual(expect.arrayContaining(["/presenze", "/vista-dirigente"]));
    expect(new Set(href).size).toBe(href.length);
  });

  it("un Admin vede tutte le voci Admin-ammesse", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    const href = voci.map((v) => v.href);
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
        "/smtp",
        "/logo",
        "/permessi-certificati",
        "/wizard-nuova-stagione",
      ])
    );
  });

  it("ogni voce ha un href e una label non vuoti", () => {
    const voci = filtraVociNavigazione(["ADMIN"]);
    for (const voce of voci) {
      expect(voce.href).toMatch(/^\//);
      expect(voce.label.length).toBeGreaterThan(0);
    }
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
});

import { describe, expect, it } from "vitest";
import { filtraVociNavigazione } from "./voci-navigazione";

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

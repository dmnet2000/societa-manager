import { describe, expect, it } from "vitest";
import { CONTENUTI_GUIDA, contenutiPerRuoli, contenutoPerRotta } from "./contenuti";
import { matchProtectedRoute } from "@/lib/auth/route-guard";

describe("contenutiPerRuoli", () => {
  it("restituisce le voci ammesse per un Ruolo universale (/sponsor) anche con un solo Ruolo (AC #1)", () => {
    const risultato = contenutiPerRuoli(["ATLETA"]);
    expect(risultato.map((c) => c.rotta)).toContain("/app/sponsor");
  });

  it("non restituisce una voce scoped se il Ruolo non è tra quelli ammessi", () => {
    const risultato = contenutiPerRuoli(["ATLETA"]);
    expect(risultato.map((c) => c.rotta)).not.toContain("/app/palestre");
  });

  it("restituisce una voce scoped (/palestre) per un Ruolo ammesso", () => {
    const risultato = contenutiPerRuoli(["ADMIN"]);
    expect(risultato.map((c) => c.rotta)).toContain("/app/palestre");
  });

  it("basta avere UNO dei Ruoli richiesti tra più Ruoli posseduti", () => {
    const risultato = contenutiPerRuoli(["ATLETA", "DIRIGENTE"]);
    expect(risultato.map((c) => c.rotta)).toEqual(expect.arrayContaining(["/app/sponsor", "/app/palestre"]));
  });

  it("restituisce un elenco vuoto per un elenco di Ruoli vuoto", () => {
    expect(contenutiPerRuoli([])).toEqual([]);
  });
});

describe("contenutoPerRotta", () => {
  it("trova il contenuto per una rotta esistente e un Ruolo ammesso (AC #3)", () => {
    const risultato = contenutoPerRotta("/app/sponsor", ["ATLETA"]);
    expect(risultato?.titolo).toBe("Sponsor");
  });

  it("restituisce null per una rotta senza alcun contenuto guida (AC #4)", () => {
    expect(contenutoPerRotta("/una-rotta-inesistente", ["ADMIN"])).toBeNull();
  });

  it("restituisce null se la rotta esiste ma l'Utente non ha un Ruolo ammesso (AC #4)", () => {
    expect(contenutoPerRotta("/app/palestre", ["ATLETA"])).toBeNull();
  });

  it("restituisce il contenuto scoped per un Ruolo effettivamente ammesso", () => {
    const risultato = contenutoPerRotta("/app/palestre", ["DIRIGENTE"]);
    expect(risultato?.titolo).toBe("Palestre");
  });
});

// Review fix (2026-08-10, Blind Hunter): CONTENUTI_GUIDA duplica a mano
// ruoliAmmessi gia' definiti in PROTECTED_ROUTES (route-guard.ts), senza
// alcuna verifica automatica che restino sincronizzati - un futuro cambio
// di Ruoli ammessi su una rotta gia' coperta dalla guida (gia' successo
// una volta, Story 16.2 su /sponsor) potrebbe disallinearsi silenziosamente.
// Non risolto con un refactor architetturale (richiederebbe rendere
// contenutoPerRotta/contenutiPerRuoli asincrone per gestire correttamente
// le rotte permessiConfigurabili, dove ruoliAmmessi in route-guard.ts non
// e' nemmeno piu' la fonte autoritativa - fuori scope per una storia
// pilota su 2 rotte) - questo test cattura la deriva invece.
describe("CONTENUTI_GUIDA coerenza con PROTECTED_ROUTES", () => {
  it("ogni rotta esiste in PROTECTED_ROUTES e ruoliAmmessi coincide come insieme", () => {
    for (const contenuto of CONTENUTI_GUIDA) {
      const route = matchProtectedRoute(contenuto.rotta);
      expect(route, `rotta "${contenuto.rotta}" non trovata in PROTECTED_ROUTES`).toBeDefined();
      expect(new Set(contenuto.ruoliAmmessi)).toEqual(new Set(route!.ruoliAmmessi));
    }
  });

  // Edge Case Hunter: due voci con la stessa rotta produrrebbero chiavi
  // React duplicate e ancore #slug duplicate in /guida.
  it("non ha rotte duplicate", () => {
    const rotte = CONTENUTI_GUIDA.map((c) => c.rotta);
    expect(new Set(rotte).size).toBe(rotte.length);
  });
});

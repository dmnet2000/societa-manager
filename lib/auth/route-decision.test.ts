import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Ruolo } from "@prisma/client";

// Story 12.3: route-decision.ts importa lib/auth/permessi-configurabili.ts
// (Story 12.2), che ha "server-only" in testa e tocca lib/prisma.ts - stesso
// mock gia' stabilito in permessi-configurabili.test.ts, riusato identico
// qui anche se i 63 test storici sotto esercitano solo il path statico
// (nessuna voce reale di PROTECTED_ROUTES ha permessiConfigurabili:true,
// quindi rottaAbilitataMock non viene mai chiamato da questi test).
vi.mock("server-only", () => ({}));

const rottaAbilitataMock = vi.fn();
vi.mock("@/lib/auth/permessi-configurabili", () => ({
  rottaAbilitataPerRuolo: rottaAbilitataMock,
}));

const { getRouteDecision, isAutorizzato } = await import("./route-decision");
// Review fix (Blind Hunter): import statico invece che dinamico dentro il
// singolo test AC #6 - nessuna ragione tecnica per un import() isolato li',
// questo modulo va gia' importato qui in testa.
const { PROTECTED_ROUTES } = await import("./route-guard");

describe("getRouteDecision", () => {
  beforeEach(() => {
    rottaAbilitataMock.mockReset();
  });


  it("allows public routes even when not authenticated", async () => {
    expect(await getRouteDecision("/accedi", false, [])).toEqual({ action: "allow" });
    expect(await getRouteDecision("/registrati", false, [])).toEqual({
      action: "allow",
    });
  });

  it("allows /recupera-password and /reimposta-password even when not authenticated (Story 9.11)", async () => {
    expect(await getRouteDecision("/recupera-password", false, [])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/reimposta-password", false, [])).toEqual({
      action: "allow",
    });
  });

  it("redirects to login when not authenticated on a non-public route", async () => {
    expect(await getRouteDecision("/", false, [])).toEqual({
      action: "redirect",
      location: "/accedi",
    });
  });

  it("allows an authenticated user on a route with no role restriction", async () => {
    expect(await getRouteDecision("/", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato when the user lacks the required role", async () => {
    expect(await getRouteDecision("/admin", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows access when the user has one of the required roles", async () => {
    expect(await getRouteDecision("/admin", true, ["ATLETA", "ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("matches nested paths under a protected prefix", async () => {
    expect(await getRouteDecision("/admin/utenti", true, [])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /import-atlete (Story 1.3, AC #4)", async () => {
    expect(await getRouteDecision("/import-atlete", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/import-atlete", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /import-atlete for other roles", async () => {
    expect(await getRouteDecision("/import-atlete", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /precaricamento-allenatori (Story 9.22: Dirigente rimosso)", async () => {
    expect(
      await getRouteDecision("/precaricamento-allenatori", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
  });

  it("allows a user holding both Admin and Dirigente on /precaricamento-allenatori (review fix Story 9.22)", async () => {
    expect(
      await getRouteDecision("/precaricamento-allenatori", true, ["ADMIN", "DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /precaricamento-allenatori for other roles, incluso Dirigente (Story 9.22)", async () => {
    expect(
      await getRouteDecision("/precaricamento-allenatori", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
    expect(
      await getRouteDecision("/precaricamento-allenatori", true, ["DIRIGENTE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });

  it("allows only Admin on /impostazioni (Story 9.24)", async () => {
    expect(await getRouteDecision("/impostazioni", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /impostazioni for other roles (Story 9.24)", async () => {
    expect(await getRouteDecision("/impostazioni", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-iscrizioni (Story 1.6/1.8: esclusione FR-23 estende l'accesso oltre la sola Segreteria)", async () => {
    expect(
      await getRouteDecision("/conferma-iscrizioni", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/conferma-iscrizioni", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/conferma-iscrizioni", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-iscrizioni for other roles", async () => {
    expect(
      await getRouteDecision("/conferma-iscrizioni", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });

  it("allows either Admin or Dirigente on /palestre (Story 2.1, FR-1)", async () => {
    expect(await getRouteDecision("/palestre", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/palestre", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /palestre for other roles", async () => {
    expect(await getRouteDecision("/palestre", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /gruppi (Story 2.2, FR-6)", async () => {
    expect(await getRouteDecision("/gruppi", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/gruppi", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /gruppi for other roles", async () => {
    expect(await getRouteDecision("/gruppi", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /slot (Story 2.5, FR-2)", async () => {
    expect(await getRouteDecision("/slot", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/slot", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /slot for other roles", async () => {
    expect(await getRouteDecision("/slot", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /mio-orario (Story 2.6 FR-3, Story 2.7 FR-4)", async () => {
    expect(await getRouteDecision("/mio-orario", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/mio-orario", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /mio-orario for other roles", async () => {
    expect(await getRouteDecision("/mio-orario", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/mio-orario", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Segreteria on /orari (Story 2.8, FR-5)", async () => {
    expect(await getRouteDecision("/orari", true, ["SEGRETERIA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /orari for other roles", async () => {
    expect(await getRouteDecision("/orari", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/orari", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Allenatore on /presenze (Story 3.1, FR-8)", async () => {
    expect(await getRouteDecision("/presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /presenze for other roles", async () => {
    expect(await getRouteDecision("/presenze", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /storico-presenze (Story 3.2, FR-9)", async () => {
    expect(await getRouteDecision("/storico-presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/storico-presenze", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /storico-presenze for other roles (AC #4: Genitore escluso)", async () => {
    expect(await getRouteDecision("/storico-presenze", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/storico-presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Genitore or Atleta on /certificato-medico (Story 4.1, FR-11)", async () => {
    expect(await getRouteDecision("/certificato-medico", true, ["GENITORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/certificato-medico", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /certificato-medico for other roles", async () => {
    expect(await getRouteDecision("/certificato-medico", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/certificato-medico", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Dirigente on /notifiche (Story 4.2, FR-12)", async () => {
    expect(await getRouteDecision("/notifiche", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/notifiche", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /notifiche for other roles", async () => {
    expect(await getRouteDecision("/notifiche", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/notifiche", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/notifiche", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/notifiche", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /smtp (Story 7.1, FR-31 - route group (configurazione) non compare nell'URL)", async () => {
    expect(await getRouteDecision("/smtp", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /smtp for other roles", async () => {
    expect(await getRouteDecision("/smtp", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/smtp", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /logo (Story 7.2, FR-32)", async () => {
    expect(await getRouteDecision("/logo", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /logo for other roles", async () => {
    expect(await getRouteDecision("/logo", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/logo", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows any Route Handler under /api/cron/ regardless of session (Story 4.6): il Cron non ha mai una sessione, l'autorizzazione e' interna al Route Handler", async () => {
    expect(
      await getRouteDecision("/api/cron/promemoria-certificati", false, [])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/api/cron/promemoria-certificati", true, ["ATLETA"])
    ).toEqual({ action: "allow" });
  });

  it("does NOT exempt /api/ routes outside /api/cron/ - a future authenticated API must still pass session/Ruolo checks (review fix, Story 4.6: scope was too broad)", async () => {
    expect(await getRouteDecision("/api/qualcosa", false, [])).toEqual({
      action: "redirect",
      location: "/accedi",
    });
  });

  it("allows /api/health regardless of session (2026-07-25): endpoint di diagnostica, deve restare raggiungibile anche con autenticazione rotta", async () => {
    expect(await getRouteDecision("/api/health", false, [])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/api/health", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("allows only Dirigente on /vista-dirigente (Story 5.1, FR-29)", async () => {
    expect(await getRouteDecision("/vista-dirigente", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("allows a multi-role user who also has Dirigente on /vista-dirigente (Story 5.1, AC #8: un Utente puo' avere piu' Ruoli)", async () => {
    expect(
      await getRouteDecision("/vista-dirigente", true, ["ALLENATORE", "DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /vista-dirigente for other roles", async () => {
    expect(await getRouteDecision("/vista-dirigente", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/vista-dirigente", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/vista-dirigente", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/vista-dirigente", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/vista-dirigente", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Allenatore on /vista-allenatore (Story 9.26)", async () => {
    expect(await getRouteDecision("/vista-allenatore", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /vista-allenatore for other roles (Story 9.26)", async () => {
    expect(await getRouteDecision("/vista-allenatore", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/vista-allenatore", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /permessi-certificati (Story 5.2, FR-27)", async () => {
    expect(await getRouteDecision("/permessi-certificati", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /permessi-certificati for other roles, incluso Dirigente stesso", async () => {
    expect(await getRouteDecision("/permessi-certificati", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/permessi-certificati", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/permessi-certificati", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/permessi-certificati", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/permessi-certificati", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-certificati (Story 4.4, FR-14)", async () => {
    expect(
      await getRouteDecision("/conferma-certificati", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/conferma-certificati", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/conferma-certificati", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-certificati for other roles", async () => {
    expect(
      await getRouteDecision("/conferma-certificati", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
    expect(
      await getRouteDecision("/conferma-certificati", true, ["GENITORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
    expect(
      await getRouteDecision("/conferma-certificati", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });

  it("allows Allenatore or Atleta on /dati-fisici (Story 6.1, FR-24)", async () => {
    expect(await getRouteDecision("/dati-fisici", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/dati-fisici", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /dati-fisici for other roles (AC #5: Genitore esplicitamente escluso, a differenza di /certificato-medico)", async () => {
    expect(await getRouteDecision("/dati-fisici", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/dati-fisici", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/dati-fisici", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/dati-fisici", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin or Dirigente on /wizard-nuova-stagione (Story 6.3, FR-28)", async () => {
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /wizard-nuova-stagione for other roles", async () => {
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/wizard-nuova-stagione", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /il-mio-profilo (Story 9.12)", async () => {
    expect(await getRouteDecision("/il-mio-profilo", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/il-mio-profilo", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /il-mio-profilo for other roles", async () => {
    expect(await getRouteDecision("/il-mio-profilo", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/il-mio-profilo", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Allenatore on /campionati (Story 10.1)", async () => {
    expect(await getRouteDecision("/campionati", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/campionati", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/campionati", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /campionati for other roles", async () => {
    expect(await getRouteDecision("/campionati", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/campionati", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Allenatore on /partite (Story 10.3)", async () => {
    expect(await getRouteDecision("/partite", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/partite", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/partite", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  // Story 10.5: estesa ad ATLETA/GENITORE (sola lettura, gating UI in
  // page.tsx) - stesso pattern gia' usato per /certificato-medico.
  it("allows Atleta or Genitore on /partite (Story 10.5)", async () => {
    expect(await getRouteDecision("/partite", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/partite", true, ["GENITORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /partite for other roles", async () => {
    expect(await getRouteDecision("/partite", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /permessi-accesso (Story 12.1)", async () => {
    expect(await getRouteDecision("/permessi-accesso", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /permessi-accesso for other roles, incluso Dirigente (Story 12.1)", async () => {
    expect(await getRouteDecision("/permessi-accesso", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(await getRouteDecision("/permessi-accesso", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });
});

// Story 12.3: isAutorizzato testata con oggetti rotta SINTETICI, non con
// PROTECTED_ROUTES reale - nessuna voce reale ha ancora permessiConfigurabili
// impostato (AC #6, nessuna rotta migrata in questa story), quindi non c'e'
// modo di esercitare il path migrato passando dai 63 test sopra.
describe("isAutorizzato", () => {
  beforeEach(() => {
    rottaAbilitataMock.mockReset();
  });

  it("path statico (nessun permessiConfigurabili): usa ruoliAmmessi, non consulta mai l'helper (AC #1)", async () => {
    const risultato = await isAutorizzato(
      { prefix: "/x", ruoliAmmessi: ["DIRIGENTE"], navLabel: "X" },
      ["DIRIGENTE"]
    );

    expect(risultato).toBe(true);
    expect(rottaAbilitataMock).not.toHaveBeenCalled();
  });

  it("path statico: nega se il Ruolo non e' tra ruoliAmmessi (AC #1)", async () => {
    const risultato = await isAutorizzato(
      { prefix: "/x", ruoliAmmessi: ["DIRIGENTE"], navLabel: "X" },
      ["ALLENATORE"]
    );

    expect(risultato).toBe(false);
    expect(rottaAbilitataMock).not.toHaveBeenCalled();
  });

  it("rotta migrata: consente se rottaAbilitataPerRuolo risolve true (AC #2)", async () => {
    rottaAbilitataMock.mockResolvedValue(true);

    const risultato = await isAutorizzato(
      { prefix: "/rotta-di-test", ruoliAmmessi: [], navLabel: "Rotta di test", permessiConfigurabili: true },
      ["DIRIGENTE"]
    );

    expect(risultato).toBe(true);
    expect(rottaAbilitataMock).toHaveBeenCalledWith("/rotta-di-test", "DIRIGENTE");
  });

  it("rotta migrata: nega se rottaAbilitataPerRuolo risolve false per ogni Ruolo (AC #3)", async () => {
    rottaAbilitataMock.mockResolvedValue(false);

    const risultato = await isAutorizzato(
      { prefix: "/rotta-di-test", ruoliAmmessi: [], navLabel: "Rotta di test", permessiConfigurabili: true },
      ["DIRIGENTE"]
    );

    expect(risultato).toBe(false);
  });

  it("rotta migrata: basta che UN Ruolo dell'utente sia abilitato (AC #4)", async () => {
    rottaAbilitataMock.mockImplementation(
      async (_rotta: string, ruolo: string) => ruolo === "DIRIGENTE"
    );

    const risultato = await isAutorizzato(
      { prefix: "/rotta-di-test", ruoliAmmessi: [], navLabel: "Rotta di test", permessiConfigurabili: true },
      ["ALLENATORE", "DIRIGENTE"]
    );

    expect(risultato).toBe(true);
  });

  it("nessuna voce reale di PROTECTED_ROUTES ha permessiConfigurabili:true in questa story (AC #6)", async () => {
    expect(PROTECTED_ROUTES.every((r) => !r.permessiConfigurabili)).toBe(true);
  });
});

// Review fix (Blind Hunter): i 63 test storici esercitano solo il path
// statico di getRouteDecision, e i test di isAutorizzato sopra la chiamano
// direttamente con oggetti sintetici - il punto di saldatura reale dentro
// getRouteDecision ("const autorizzato = await isAutorizzato(protectedRoute,
// ruoli)") non era mai stato esercitato end-to-end con una rotta migrata.
// Un bug di wiring li' (argomenti scambiati, await dimenticato) sarebbe
// passato inosservato fino a Story 12.4 in produzione. Questo test inserisce
// temporaneamente una rotta sintetica in PROTECTED_ROUTES (l'unico modo di
// esercitare matchProtectedRoute + isAutorizzato + getRouteDecision insieme)
// e la rimuove sempre in un finally, cosi' l'invariante "nessuna rotta reale
// migrata" (AC #6, verificato sopra) resta vero per ogni altro test.
describe("getRouteDecision + isAutorizzato integrazione end-to-end (rotta migrata)", () => {
  const ROTTA_TEST = {
    prefix: "/rotta-migrata-di-test",
    ruoliAmmessi: [] as Ruolo[],
    navLabel: "Rotta di test",
    permessiConfigurabili: true,
  };

  beforeEach(() => {
    rottaAbilitataMock.mockReset();
  });

  it("consente l'accesso end-to-end quando rottaAbilitataPerRuolo risolve true", async () => {
    rottaAbilitataMock.mockResolvedValue(true);
    PROTECTED_ROUTES.push(ROTTA_TEST);
    try {
      const risultato = await getRouteDecision(
        "/rotta-migrata-di-test",
        true,
        ["DIRIGENTE"]
      );

      expect(risultato).toEqual({ action: "allow" });
      expect(rottaAbilitataMock).toHaveBeenCalledWith(
        "/rotta-migrata-di-test",
        "DIRIGENTE"
      );
    } finally {
      PROTECTED_ROUTES.pop();
    }
  });

  it("nega l'accesso end-to-end (redirect) quando rottaAbilitataPerRuolo risolve false", async () => {
    rottaAbilitataMock.mockResolvedValue(false);
    PROTECTED_ROUTES.push(ROTTA_TEST);
    try {
      const risultato = await getRouteDecision(
        "/rotta-migrata-di-test",
        true,
        ["DIRIGENTE"]
      );

      expect(risultato).toEqual({
        action: "redirect",
        location: "/non-autorizzato",
      });
    } finally {
      PROTECTED_ROUTES.pop();
    }
  });
});

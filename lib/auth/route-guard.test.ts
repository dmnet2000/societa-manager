import { describe, expect, it } from "vitest";
import { getRouteDecision } from "./route-guard";

describe("getRouteDecision", () => {
  it("allows public routes even when not authenticated", () => {
    expect(getRouteDecision("/accedi", false, [])).toEqual({ action: "allow" });
    expect(getRouteDecision("/registrati", false, [])).toEqual({
      action: "allow",
    });
  });

  it("redirects to login when not authenticated on a non-public route", () => {
    expect(getRouteDecision("/", false, [])).toEqual({
      action: "redirect",
      location: "/accedi",
    });
  });

  it("allows an authenticated user on a route with no role restriction", () => {
    expect(getRouteDecision("/", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato when the user lacks the required role", () => {
    expect(getRouteDecision("/admin", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows access when the user has one of the required roles", () => {
    expect(getRouteDecision("/admin", true, ["ATLETA", "ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("matches nested paths under a protected prefix", () => {
    expect(getRouteDecision("/admin/utenti", true, [])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /import-atlete (Story 1.3, AC #4)", () => {
    expect(getRouteDecision("/import-atlete", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/import-atlete", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /import-atlete for other roles", () => {
    expect(getRouteDecision("/import-atlete", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /precaricamento-allenatori (Story 1.4)", () => {
    expect(
      getRouteDecision("/precaricamento-allenatori", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
    expect(
      getRouteDecision("/precaricamento-allenatori", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /precaricamento-allenatori for other roles", () => {
    expect(
      getRouteDecision("/precaricamento-allenatori", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-iscrizioni (Story 1.6/1.8: esclusione FR-23 estende l'accesso oltre la sola Segreteria)", () => {
    expect(
      getRouteDecision("/conferma-iscrizioni", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
    expect(
      getRouteDecision("/conferma-iscrizioni", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      getRouteDecision("/conferma-iscrizioni", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-iscrizioni for other roles", () => {
    expect(
      getRouteDecision("/conferma-iscrizioni", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });

  it("allows either Admin or Dirigente on /palestre (Story 2.1, FR-1)", () => {
    expect(getRouteDecision("/palestre", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/palestre", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /palestre for other roles", () => {
    expect(getRouteDecision("/palestre", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /gruppi (Story 2.2, FR-6)", () => {
    expect(getRouteDecision("/gruppi", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/gruppi", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /gruppi for other roles", () => {
    expect(getRouteDecision("/gruppi", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /slot (Story 2.5, FR-2)", () => {
    expect(getRouteDecision("/slot", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/slot", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /slot for other roles", () => {
    expect(getRouteDecision("/slot", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /mio-orario (Story 2.6 FR-3, Story 2.7 FR-4)", () => {
    expect(getRouteDecision("/mio-orario", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/mio-orario", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /mio-orario for other roles", () => {
    expect(getRouteDecision("/mio-orario", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/mio-orario", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Segreteria on /orari (Story 2.8, FR-5)", () => {
    expect(getRouteDecision("/orari", true, ["SEGRETERIA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /orari for other roles", () => {
    expect(getRouteDecision("/orari", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/orari", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Allenatore on /presenze (Story 3.1, FR-8)", () => {
    expect(getRouteDecision("/presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /presenze for other roles", () => {
    expect(getRouteDecision("/presenze", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /storico-presenze (Story 3.2, FR-9)", () => {
    expect(getRouteDecision("/storico-presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/storico-presenze", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /storico-presenze for other roles (AC #4: Genitore escluso)", () => {
    expect(getRouteDecision("/storico-presenze", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/storico-presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Genitore or Atleta on /certificato-medico (Story 4.1, FR-11)", () => {
    expect(getRouteDecision("/certificato-medico", true, ["GENITORE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/certificato-medico", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /certificato-medico for other roles", () => {
    expect(getRouteDecision("/certificato-medico", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/certificato-medico", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Allenatore or Dirigente on /notifiche (Story 4.2, FR-12)", () => {
    expect(getRouteDecision("/notifiche", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(getRouteDecision("/notifiche", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /notifiche for other roles", () => {
    expect(getRouteDecision("/notifiche", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/notifiche", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/notifiche", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/notifiche", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /smtp (Story 7.1, FR-31 - route group (configurazione) non compare nell'URL)", () => {
    expect(getRouteDecision("/smtp", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /smtp for other roles", () => {
    expect(getRouteDecision("/smtp", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/smtp", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows only Admin on /logo (Story 7.2, FR-32)", () => {
    expect(getRouteDecision("/logo", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /logo for other roles", () => {
    expect(getRouteDecision("/logo", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
    expect(getRouteDecision("/logo", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-certificati (Story 4.4, FR-14)", () => {
    expect(
      getRouteDecision("/conferma-certificati", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      getRouteDecision("/conferma-certificati", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
    expect(
      getRouteDecision("/conferma-certificati", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-certificati for other roles", () => {
    expect(
      getRouteDecision("/conferma-certificati", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
    expect(
      getRouteDecision("/conferma-certificati", true, ["GENITORE"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
    expect(
      getRouteDecision("/conferma-certificati", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/non-autorizzato" });
  });
});

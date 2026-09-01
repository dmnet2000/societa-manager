import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Ruolo } from "@prisma/client";

// Story 12.3: route-decision.ts importa lib/auth/permessi-configurabili.ts
// (Story 12.2), che ha "server-only" in testa - stesso mock gia' stabilito
// in permessi-configurabili.test.ts, riusato identico qui.
// Review fix (Acceptance Auditor, Story 12.4): questo commento diceva
// ancora "nessuna voce reale ha permessiConfigurabili:true, rottaAbilitataMock
// non viene mai chiamato" - non piu' vero da quando /precaricamento-allenatori
// e' stata migrata (Story 12.4): i 3 test dedicati a quella rotta, poco
// sotto, ora configurano esplicitamente rottaAbilitataMock. Gli altri 60
// test (le restanti 25 rotte statiche) continuano a non chiamarlo mai.
vi.mock("server-only", () => ({}));

const rottaAbilitataMock = vi.fn();
vi.mock("@/lib/auth/permessi-configurabili", () => ({
  rottaAbilitataPerRuolo: rottaAbilitataMock,
}));

// Story 19.9 (Epic 19, Ruolo Site Manager): route-decision.ts consulta anche
// paginaPubblicaEsistePerSlug (lib/auth/pagine-pubbliche-slug-cache.ts,
// mirror edge-safe di rottaAbilitataPerRuolo sopra) per lasciar passare un
// Visitatore anonimo verso una PaginaPubblica esistente prima di
// reindirizzarlo a /accedi. Mockato qui per non fare mai una vera chiamata
// Supabase durante i test - default false (beforeEach sotto) cosi' i test
// storici (che precedono questa storia) restano invariati per costruzione.
const paginaPubblicaEsisteMock = vi.fn();
vi.mock("@/lib/auth/pagine-pubbliche-slug-cache", () => ({
  paginaPubblicaEsistePerSlug: paginaPubblicaEsisteMock,
}));

const { getRouteDecision, isAutorizzato } = await import("./route-decision");
// Review fix (Blind Hunter): import statico invece che dinamico dentro il
// singolo test AC #6 - nessuna ragione tecnica per un import() isolato li',
// questo modulo va gia' importato qui in testa.
const { PROTECTED_ROUTES, isPublicRoute } = await import("./route-guard");

describe("getRouteDecision", () => {
  beforeEach(() => {
    rottaAbilitataMock.mockReset();
    paginaPubblicaEsisteMock.mockReset();
    paginaPubblicaEsisteMock.mockResolvedValue(false);
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

  it("allows /conferma-registrazione even when not authenticated (Story 11.4)", async () => {
    expect(await getRouteDecision("/conferma-registrazione", false, [])).toEqual({
      action: "allow",
    });
  });

  it("redirects to login when not authenticated on a non-public route", async () => {
    expect(await getRouteDecision("/app", false, [])).toEqual({
      action: "redirect",
      location: "/accedi",
    });
  });

  // Story 18.1 (Epic 18): "/" e' ora pubblica (la home del sito pubblico) -
  // prima di questa storia era l'esempio usato dal test sopra per "una
  // rotta non pubblica qualunque".
  it("allows unauthenticated access to '/' (nuova home pubblica, Story 18.1)", async () => {
    expect(await getRouteDecision("/", false, [])).toEqual({ action: "allow" });
    expect(isPublicRoute("/")).toBe(true);
  });

  // Review fix (Story 18.7, Blind Hunter + Edge Case Hunter): senza
  // l'aggiunta a PUBLIC_ROUTES, un Visitatore anonimo che clicca una voce
  // del nuovo menu pubblico (app/NavPubblica.tsx) veniva reindirizzato a
  // /accedi invece di ricevere la 404 prevista - nessuna pagina esiste
  // ancora dietro questi path (Story 18.8-18.11), ma il Proxy deve
  // comunque lasciarli passare perche' Next.js mostri la propria 404.
  it.each(["/squadre", "/calendario", "/staff", "/contatti"])(
    "allows unauthenticated access to '%s' (menu pubblico, Story 18.7 - nessuna pagina dietro ancora, la 404 e' di Next.js)",
    async (pathname) => {
      expect(await getRouteDecision(pathname, false, [])).toEqual({ action: "allow" });
      expect(isPublicRoute(pathname)).toBe(true);
    }
  );

  // Bug report utente (2026-08-26): /torneo era stata dimenticata in
  // PUBLIC_ROUTES al momento della sua introduzione (Story 20.6) -
  // esattamente lo stesso bug gia' corretto sopra per Story 18.7, ma qui la
  // pagina pubblica reale esiste gia' dietro il path (a differenza del test
  // 18.7 sopra, che copriva 4 rotte ancora senza pagina).
  it("allows unauthenticated access to '/torneo' (menu pubblico, la pagina pubblica esiste gia' - Story 20.6)", async () => {
    expect(await getRouteDecision("/torneo", false, [])).toEqual({ action: "allow" });
    expect(isPublicRoute("/torneo")).toBe(true);
  });

  // Review fix (Blind Hunter, Story 18.1): usava "/" prima che diventasse
  // pubblica (Story 18.1) - il test era diventato ridondante col test
  // pubblico appena sopra e non copriva piu' nessun caso di autenticazione
  // reale. "/app" non ha una voce dedicata in PROTECTED_ROUTES (nessun
  // prefix esatto "/app"), quindi matchProtectedRoute non trova
  // corrispondenza: stesso identico scenario "rotta protetta senza
  // restrizione di Ruolo" che il test intende verificare.
  it("allows an authenticated user on a route with no role restriction", async () => {
    expect(await getRouteDecision("/app", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato when the user lacks the required role", async () => {
    expect(await getRouteDecision("/app/admin", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows access when the user has one of the required roles", async () => {
    expect(await getRouteDecision("/app/admin", true, ["ATLETA", "ADMIN"])).toEqual({
      action: "allow",
    });
  });

  // Story 19.2 (review fix, Blind Hunter): l'AC della spec dichiara
  // esplicitamente che SITE_MANAGER resta bloccato da /app/admin - questo
  // era asserito solo nel testo della spec, senza un test dedicato.
  it("redirects Site Manager away from /app/admin (Story 19.2, resta admin-only)", async () => {
    expect(await getRouteDecision("/app/admin", true, ["SITE_MANAGER"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("redirects Site Manager away from /app/gruppi (Story 19.2, resta ADMIN/DIRIGENTE-only)", async () => {
    expect(await getRouteDecision("/app/gruppi", true, ["SITE_MANAGER"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("matches nested paths under a protected prefix", async () => {
    expect(await getRouteDecision("/app/admin/utenti", true, [])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /import-atlete (Story 1.3, AC #4)", async () => {
    expect(await getRouteDecision("/app/import-atlete", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/import-atlete", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /import-atlete for other roles", async () => {
    expect(await getRouteDecision("/app/import-atlete", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  // Story 12.4: /precaricamento-allenatori e' ora migrata
  // (permessiConfigurabili:true) - getRouteDecision per questa rotta passa
  // da isAutorizzato, che chiama il MOCK rottaAbilitataMock (l'intero
  // modulo permessi-configurabili.ts e' mockato in testa a questo file),
  // non la vera rottaAbilitataPerRuolo (che ha lo short-circuit ADMIN reale,
  // Story 12.2, invariato in produzione). Questi 3 test riconfigurano
  // esplicitamente il mock per replicare quel comportamento nello scenario
  // di test - un mock "muto" risolverebbe undefined (falsy) anche per ADMIN.
  it("allows only Admin on /precaricamento-allenatori (Story 9.22 + 12.4: migrata, ADMIN comunque sempre autorizzato)", async () => {
    rottaAbilitataMock.mockImplementation(
      async (_rotta: string, ruolo: string) => ruolo === "ADMIN"
    );

    expect(
      await getRouteDecision("/app/precaricamento-allenatori", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
  });

  it("allows a user holding both Admin and Dirigente on /precaricamento-allenatori (review fix Story 9.22, Story 12.4)", async () => {
    rottaAbilitataMock.mockImplementation(
      async (_rotta: string, ruolo: string) => ruolo === "ADMIN"
    );

    expect(
      await getRouteDecision("/app/precaricamento-allenatori", true, ["ADMIN", "DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /precaricamento-allenatori for other roles, incluso Dirigente - nessuna riga permessi_rotte per questa rotta oggi, fail-closed (Story 9.22, Story 12.4)", async () => {
    rottaAbilitataMock.mockResolvedValue(false);

    expect(
      await getRouteDecision("/app/precaricamento-allenatori", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
    expect(
      await getRouteDecision("/app/precaricamento-allenatori", true, ["DIRIGENTE"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  // Review fix (Verification Gap Reviewer, Story 9.41): /precaricamento-ruoli
  // e' ADMIN-only hardcoded (nessun permessiConfigurabili, a differenza di
  // /precaricamento-allenatori sopra) - mirror del pattern piu' semplice di
  // /impostazioni sotto, nessun mock di rottaAbilitataPerRuolo necessario.
  it("allows Admin on /precaricamento-ruoli (Story 9.41)", async () => {
    expect(await getRouteDecision("/app/precaricamento-ruoli", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /precaricamento-ruoli for other roles, incluso Segreteria/Dirigente stessi (Story 9.41, ADMIN-only)", async () => {
    expect(
      await getRouteDecision("/app/precaricamento-ruoli", true, ["SEGRETERIA"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
    expect(
      await getRouteDecision("/app/precaricamento-ruoli", true, ["DIRIGENTE"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  it("allows Admin on /impostazioni (Story 9.24)", async () => {
    expect(await getRouteDecision("/app/impostazioni", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  // Fix code review (Story 18.13): era ADMIN-only, ma 3 delle 4 sezioni di
  // questa pagina (Pagina Facebook, Contatti pubblici, Token Facebook)
  // ammettono gia' DIRIGENTE a livello di Server Action - senza aprire
  // anche la rotta, un Dirigente non raggiungeva mai quelle form (AC #6
  // di Story 18.13 non soddisfatto). Solo Email Segreteria resta
  // ADMIN-only alla propria action, invariata.
  it("allows Dirigente on /impostazioni (fix code review Story 18.13)", async () => {
    expect(await getRouteDecision("/app/impostazioni", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("allows Site Manager on /impostazioni (Story 19.1)", async () => {
    expect(await getRouteDecision("/app/impostazioni", true, ["SITE_MANAGER"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /impostazioni for other roles", async () => {
    expect(await getRouteDecision("/app/impostazioni", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-iscrizioni (Story 1.6/1.8: esclusione FR-23 estende l'accesso oltre la sola Segreteria)", async () => {
    expect(
      await getRouteDecision("/app/conferma-iscrizioni", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/app/conferma-iscrizioni", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/app/conferma-iscrizioni", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-iscrizioni for other roles", async () => {
    expect(
      await getRouteDecision("/app/conferma-iscrizioni", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  it("allows Admin or Dirigente on /conferma-tesseramenti (Story 13.1)", async () => {
    expect(
      await getRouteDecision("/app/conferma-tesseramenti", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/app/conferma-tesseramenti", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-tesseramenti for Segreteria (Story 13.1: esclusa esplicitamente, a differenza di /conferma-iscrizioni)", async () => {
    expect(
      await getRouteDecision("/app/conferma-tesseramenti", true, ["SEGRETERIA"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  it("redirects to /non-autorizzato on /conferma-tesseramenti for other roles", async () => {
    expect(
      await getRouteDecision("/app/conferma-tesseramenti", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  it("allows either Admin or Dirigente on /palestre (Story 2.1, FR-1)", async () => {
    expect(await getRouteDecision("/app/palestre", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/palestre", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /palestre for other roles", async () => {
    expect(await getRouteDecision("/app/palestre", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /gruppi (Story 2.2, FR-6)", async () => {
    expect(await getRouteDecision("/app/gruppi", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/gruppi", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /gruppi for other roles", async () => {
    expect(await getRouteDecision("/app/gruppi", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows either Admin or Dirigente on /slot (Story 2.5, FR-2)", async () => {
    expect(await getRouteDecision("/app/slot", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/slot", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /slot for other roles", async () => {
    expect(await getRouteDecision("/app/slot", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /mio-orario (Story 2.6 FR-3, Story 2.7 FR-4)", async () => {
    expect(await getRouteDecision("/app/mio-orario", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/mio-orario", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /mio-orario for other roles", async () => {
    expect(await getRouteDecision("/app/mio-orario", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/mio-orario", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows only Segreteria on /orari (Story 2.8, FR-5)", async () => {
    expect(await getRouteDecision("/app/orari", true, ["SEGRETERIA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /orari for other roles", async () => {
    expect(await getRouteDecision("/app/orari", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/orari", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows only Allenatore on /presenze (Story 3.1, FR-8)", async () => {
    expect(await getRouteDecision("/app/presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /presenze for other roles", async () => {
    expect(await getRouteDecision("/app/presenze", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /storico-presenze (Story 3.2, FR-9)", async () => {
    expect(await getRouteDecision("/app/storico-presenze", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/storico-presenze", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /storico-presenze for other roles (AC #4: Genitore escluso)", async () => {
    expect(await getRouteDecision("/app/storico-presenze", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/storico-presenze", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Genitore or Atleta on /certificato-medico (Story 4.1, FR-11)", async () => {
    expect(await getRouteDecision("/app/certificato-medico", true, ["GENITORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/certificato-medico", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /certificato-medico for other roles", async () => {
    expect(await getRouteDecision("/app/certificato-medico", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/certificato-medico", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Allenatore or Dirigente on /notifiche (Story 4.2, FR-12)", async () => {
    expect(await getRouteDecision("/app/notifiche", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/notifiche", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /notifiche for other roles", async () => {
    expect(await getRouteDecision("/app/notifiche", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/notifiche", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/notifiche", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/notifiche", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows only Admin on /smtp (Story 7.1, FR-31 - route group (configurazione) non compare nell'URL)", async () => {
    expect(await getRouteDecision("/app/smtp", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /smtp for other roles", async () => {
    expect(await getRouteDecision("/app/smtp", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/smtp", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin and Site Manager on /logo (Story 7.2, FR-32; SITE_MANAGER aggiunto in Story 19.2)", async () => {
    expect(await getRouteDecision("/app/logo", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/logo", true, ["SITE_MANAGER"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /logo for other roles", async () => {
    expect(await getRouteDecision("/app/logo", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/logo", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
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
    expect(await getRouteDecision("/app/vista-dirigente", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("allows a multi-role user who also has Dirigente on /vista-dirigente (Story 5.1, AC #8: un Utente puo' avere piu' Ruoli)", async () => {
    expect(
      await getRouteDecision("/app/vista-dirigente", true, ["ALLENATORE", "DIRIGENTE"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /vista-dirigente for other roles", async () => {
    expect(await getRouteDecision("/app/vista-dirigente", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/vista-dirigente", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/vista-dirigente", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/vista-dirigente", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/vista-dirigente", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows only Allenatore on /vista-allenatore (Story 9.26)", async () => {
    expect(await getRouteDecision("/app/vista-allenatore", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /vista-allenatore for other roles (Story 9.26)", async () => {
    expect(await getRouteDecision("/app/vista-allenatore", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/vista-allenatore", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows only Admin on /permessi-certificati (Story 5.2, FR-27)", async () => {
    expect(await getRouteDecision("/app/permessi-certificati", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /permessi-certificati for other roles, incluso Dirigente stesso", async () => {
    expect(await getRouteDecision("/app/permessi-certificati", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/permessi-certificati", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/permessi-certificati", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/permessi-certificati", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/permessi-certificati", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Segreteria on /conferma-certificati (Story 4.4, FR-14)", async () => {
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["ADMIN"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["DIRIGENTE"])
    ).toEqual({ action: "allow" });
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["SEGRETERIA"])
    ).toEqual({ action: "allow" });
  });

  it("redirects to /non-autorizzato on /conferma-certificati for other roles", async () => {
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["ALLENATORE"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["GENITORE"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
    expect(
      await getRouteDecision("/app/conferma-certificati", true, ["ATLETA"])
    ).toEqual({ action: "redirect", location: "/app/non-autorizzato" });
  });

  it("allows Allenatore or Atleta on /dati-fisici (Story 6.1, FR-24)", async () => {
    expect(await getRouteDecision("/app/dati-fisici", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/dati-fisici", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /dati-fisici for other roles (AC #5: Genitore esplicitamente escluso, a differenza di /certificato-medico)", async () => {
    expect(await getRouteDecision("/app/dati-fisici", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/dati-fisici", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/dati-fisici", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/dati-fisici", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin or Dirigente on /wizard-nuova-stagione (Story 6.3, FR-28)", async () => {
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /wizard-nuova-stagione for other roles", async () => {
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["ALLENATORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/wizard-nuova-stagione", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Allenatore or Atleta on /il-mio-profilo (Story 9.12)", async () => {
    expect(await getRouteDecision("/app/il-mio-profilo", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/il-mio-profilo", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /il-mio-profilo for other roles", async () => {
    expect(await getRouteDecision("/app/il-mio-profilo", true, ["ADMIN"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/il-mio-profilo", true, ["GENITORE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Allenatore on /campionati (Story 10.1)", async () => {
    expect(await getRouteDecision("/app/campionati", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/campionati", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/campionati", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /campionati for other roles", async () => {
    expect(await getRouteDecision("/app/campionati", true, ["ATLETA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/campionati", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  it("allows Admin, Dirigente or Allenatore on /partite (Story 10.3)", async () => {
    expect(await getRouteDecision("/app/partite", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/partite", true, ["DIRIGENTE"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/partite", true, ["ALLENATORE"])).toEqual({
      action: "allow",
    });
  });

  // Story 10.5: estesa ad ATLETA/GENITORE (sola lettura, gating UI in
  // page.tsx) - stesso pattern gia' usato per /certificato-medico.
  it("allows Atleta or Genitore on /partite (Story 10.5)", async () => {
    expect(await getRouteDecision("/app/partite", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
    expect(await getRouteDecision("/app/partite", true, ["GENITORE"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /partite for other roles", async () => {
    expect(await getRouteDecision("/app/partite", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  // Story 16.2: /sponsor e' diventata la prima rotta autenticata del
  // progetto visibile a TUTTI i Ruoli (vetrina pubblica, contenuto
  // condizionale in page.tsx per i controlli di gestione Admin/Dirigente).
  // Story 19.3: SITE_MANAGER aggiunto alla lista, settimo Ruolo.
  it.each(
    ["ALLENATORE", "ATLETA", "GENITORE", "SEGRETERIA", "DIRIGENTE", "ADMIN", "SITE_MANAGER"] as const
  )(
    "allows %s on /sponsor (Story 16.1/16.2/19.3)",
    async (ruolo) => {
      expect(await getRouteDecision("/app/sponsor", true, [ruolo])).toEqual({
        action: "allow",
      });
    }
  );

  it("matches the nested voucher route /sponsor/[id]/voucher under the same prefix (Story 16.2)", async () => {
    expect(await getRouteDecision("/app/sponsor/abc-123/voucher", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  // Story 17.1: /guida e' la seconda rotta del progetto visibile a tutti i
  // Ruoli (mirror di /sponsor) - il contenuto mostrato resta filtrato per
  // Ruolo in page.tsx (lib/guida/contenuti.ts), qui si verifica solo che la
  // rotta stessa sia raggiungibile.
  it.each(["ALLENATORE", "ATLETA", "GENITORE", "SEGRETERIA", "DIRIGENTE", "ADMIN"] as const)(
    "allows %s on /guida (Story 17.1)",
    async (ruolo) => {
      expect(await getRouteDecision("/app/guida", true, [ruolo])).toEqual({
        action: "allow",
      });
    }
  );

  it("allows only Admin on /permessi-accesso (Story 12.1)", async () => {
    expect(await getRouteDecision("/app/permessi-accesso", true, ["ADMIN"])).toEqual({
      action: "allow",
    });
  });

  it("redirects to /non-autorizzato on /permessi-accesso for other roles, incluso Dirigente (Story 12.1)", async () => {
    expect(await getRouteDecision("/app/permessi-accesso", true, ["DIRIGENTE"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
    expect(await getRouteDecision("/app/permessi-accesso", true, ["SEGRETERIA"])).toEqual({
      action: "redirect",
      location: "/app/non-autorizzato",
    });
  });

  // Story 19.9 (Epic 19, Ruolo Site Manager, AC #1): senza questo,
  // paginaPubblicaEsisteMock=false (default beforeEach) fa cadere un
  // pathname sconosciuto sul ramo "redirect a /accedi" per un Visitatore
  // anonimo - stesso identico comportamento di oggi per un typo/link morto
  // (invariato, AC #2). Qui il mock simula "esiste una PaginaPubblica con
  // questo slug": il Visitatore anonimo deve passare, non essere
  // reindirizzato al login.
  it("allows an anonymous Visitatore on an unknown pathname that matches an existing PaginaPubblica (Story 19.9, AC #1)", async () => {
    paginaPubblicaEsisteMock.mockResolvedValue(true);

    expect(await getRouteDecision("/storia-societa", false, [])).toEqual({
      action: "allow",
    });
    expect(paginaPubblicaEsisteMock).toHaveBeenCalledWith("/storia-societa");
  });

  // Story 19.9, AC #2: nessuna Pagina corrispondente -> comportamento di
  // oggi invariato (redirect a /accedi per un Visitatore anonimo, la 404
  // vera arriva solo per chi e' gia' autenticato - vedi test sotto).
  it("still redirects an anonymous Visitatore to /accedi when no PaginaPubblica matches the pathname (Story 19.9, AC #2 - nessuna regressione)", async () => {
    expect(await getRouteDecision("/pagina-inesistente", false, [])).toEqual({
      action: "redirect",
      location: "/accedi",
    });
  });

  it("allows an authenticated user on an unknown pathname regardless of PaginaPubblica match (falls through to the existing no-restriction path)", async () => {
    expect(await getRouteDecision("/pagina-inesistente", true, ["ATLETA"])).toEqual({
      action: "allow",
    });
  });

  // Code review: "!isAuthenticated &&" aggiunto davanti al controllo -
  // l'esito per un Utente autenticato non dipende mai da
  // paginaPubblicaEsistePerSlug (test sopra), quindi non va nemmeno
  // interrogata per lui.
  it("never queries paginaPubblicaEsistePerSlug for an already authenticated user", async () => {
    await getRouteDecision("/pagina-inesistente", true, ["ATLETA"]);

    expect(paginaPubblicaEsisteMock).not.toHaveBeenCalled();
  });

  // Story 19.9: rottaRiservata(pathname) esclude "/app/*"/"/api/*" PRIMA di
  // interrogare il database - unica fonte di verita' condivisa con
  // urlVoceMenuValido (menu-pubblico/actions.ts) e la futura validazione
  // della Story 19.10, nessuna query sprecata per un pathname che non potra'
  // mai essere una PaginaPubblica.
  it("never queries paginaPubblicaEsistePerSlug for a pathname under /app or /api (rottaRiservata short-circuit)", async () => {
    await getRouteDecision("/app/qualcosa-di-sconosciuto", false, []);
    await getRouteDecision("/api/qualcosa-di-sconosciuto", false, []);

    expect(paginaPubblicaEsisteMock).not.toHaveBeenCalled();
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

  // Story 12.4: aggiornato - prima di questa story nessuna rotta reale era
  // migrata (AC #6 di Story 12.3); ora /precaricamento-allenatori lo e'
  // (Story 12.4, PoC end-to-end), l'unica. Guardia esplicita contro una
  // migrazione accidentale/prematura di un'ALTRA rotta reale.
  it("solo /precaricamento-allenatori ha permessiConfigurabili:true in PROTECTED_ROUTES (Story 12.4)", async () => {
    const migrate = PROTECTED_ROUTES.filter((r) => r.permessiConfigurabili);

    expect(migrate.map((r) => r.prefix)).toEqual(["/app/precaricamento-allenatori"]);
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
        location: "/app/non-autorizzato",
      });
    } finally {
      PROTECTED_ROUTES.pop();
    }
  });
});

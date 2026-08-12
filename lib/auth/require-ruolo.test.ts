import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

// Story 12.4: require-ruolo.ts importa isAutorizzato da route-decision.ts
// (Story 12.3) - mockato interamente qui, cosi' il modulo reale (che tocca
// permessi-configurabili.ts -> lib/prisma.ts) non viene mai caricato.
// matchProtectedRoute/PROTECTED_ROUTES restano quelli VERI (route-guard.ts,
// puri, nessun side-effect) - usare rotte reali (es.
// "/app/precaricamento-allenatori", gia' migrata da questa stessa story) rende
// il test rappresentativo dello scenario reale invece che sintetico.
const isAutorizzatoMock = vi.fn();
vi.mock("@/lib/auth/route-decision", () => ({
  isAutorizzato: isAutorizzatoMock,
}));

const { requireRuolo } = await import("./require-ruolo");

describe("requireRuolo", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isAutorizzatoMock.mockReset();
  });

  it("returns null when the authenticated user has the required ruolo", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ADMIN"] } } },
    });

    expect(await requireRuolo("ADMIN")).toBeNull();
  });

  it("returns a FORBIDDEN error when the user lacks the required ruolo", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ATLETA"] } } },
    });

    expect(await requireRuolo("ADMIN")).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("returns a FORBIDDEN error when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    expect(await requireRuolo("ADMIN")).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("returns null when the user has at least one of multiple allowed ruoli", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["DIRIGENTE"] } } },
    });

    expect(await requireRuolo(["ADMIN", "DIRIGENTE"])).toBeNull();
  });

  it("returns a FORBIDDEN error when the user has none of multiple allowed ruoli", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ATLETA"] } } },
    });

    expect(await requireRuolo(["ADMIN", "DIRIGENTE"])).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("logs and stays fail-closed when getUser() itself returns an error (review fix)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "auth service down" },
    });

    const result = await requireRuolo("ADMIN");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // Story 12.4: parametro opzionale `rotta` - meccanismo di collegamento
  // Server Action <-> permessi configurabili (Epic 12).
  describe("con il parametro rotta (Story 12.4)", () => {
    it("comportamento invariato se rotta non e' fornita - non chiama mai isAutorizzato", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { app_metadata: { ruoli: ["ADMIN"] } } },
      });

      expect(await requireRuolo("ADMIN")).toBeNull();
      expect(isAutorizzatoMock).not.toHaveBeenCalled();
    });

    it("comportamento invariato se la rotta non e' migrata (permessiConfigurabili non impostato) - usa ruoliRichiesti hardcoded, non chiama isAutorizzato", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { app_metadata: { ruoli: ["DIRIGENTE"] } } },
      });

      // /palestre ammette DIRIGENTE nel suo ruoliAmmessi statico, non e'
      // migrata - deve passare dal path hardcoded.
      expect(await requireRuolo(["ADMIN", "DIRIGENTE"], "/app/palestre")).toBeNull();
      expect(isAutorizzatoMock).not.toHaveBeenCalled();
    });

    it("comportamento invariato se la rotta fornita non esiste in PROTECTED_ROUTES", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { app_metadata: { ruoli: ["ADMIN"] } } },
      });

      expect(await requireRuolo("ADMIN", "/rotta-inventata")).toBeNull();
      expect(isAutorizzatoMock).not.toHaveBeenCalled();
    });

    it("rotta migrata (/precaricamento-allenatori): consente se isAutorizzato risolve true, ignorando ruoliRichiesti", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { app_metadata: { ruoli: ["DIRIGENTE"] } } },
      });
      isAutorizzatoMock.mockResolvedValue(true);

      // ruoliRichiesti=["ADMIN"] non includerebbe DIRIGENTE nel path statico,
      // ma la rotta e' migrata: isAutorizzato decide, non questo array.
      const risultato = await requireRuolo(
        ["ADMIN"],
        "/app/precaricamento-allenatori"
      );

      expect(risultato).toBeNull();
      expect(isAutorizzatoMock).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: "/app/precaricamento-allenatori" }),
        ["DIRIGENTE"]
      );
    });

    it("rotta migrata (/precaricamento-allenatori): nega (FORBIDDEN) se isAutorizzato risolve false", async () => {
      getUserMock.mockResolvedValue({
        data: { user: { app_metadata: { ruoli: ["ATLETA"] } } },
      });
      isAutorizzatoMock.mockResolvedValue(false);

      const risultato = await requireRuolo(
        ["ADMIN"],
        "/app/precaricamento-allenatori"
      );

      expect(risultato).toEqual({
        error: { code: "FORBIDDEN", message: "Non autorizzato." },
      });
    });
  });
});

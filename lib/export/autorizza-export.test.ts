import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));

const { rifiutaExportNonAutorizzato } = await import("./autorizza-export");

// Review fix (code review Epic 28): i test delle rotte simulano
// requireRuolo; qui si verifica la lettura dei Ruoli da PROTECTED_ROUTES e
// il rifiuto di una rotta non protetta.
describe("rifiutaExportNonAutorizzato (Story 28.1)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
  });

  it("controlla i Ruoli ammessi letti da PROTECTED_ROUTES per la pagina", async () => {
    requireRuoloMock.mockResolvedValue(null);

    expect(await rifiutaExportNonAutorizzato("/app/conferma-tesseramenti")).toBeNull();
    expect(requireRuoloMock).toHaveBeenCalledWith(
      ["ADMIN", "DIRIGENTE"],
      "/app/conferma-tesseramenti"
    );
  });

  it("risponde 403 no-store se requireRuolo rifiuta", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const risposta = await rifiutaExportNonAutorizzato("/app/export-dati");

    expect(risposta?.status).toBe(403);
    expect(risposta?.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rifiuta con 403 una rotta assente da PROTECTED_ROUTES, senza chiamare requireRuolo", async () => {
    const risposta = await rifiutaExportNonAutorizzato("/app/rotta-inesistente");

    expect(risposta?.status).toBe(403);
    expect(requireRuoloMock).not.toHaveBeenCalled();
  });
});

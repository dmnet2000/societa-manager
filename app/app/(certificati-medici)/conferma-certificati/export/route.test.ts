import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const elencaAtleteMock = vi.fn();
const elencaCertificatiMock = vi.fn();
const elencaNomiGruppiPerAtletaCorrentiMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db-rls/atleta", () => ({ elencaAtlete: elencaAtleteMock }));
vi.mock("@/lib/db-rls/certificato-medico", () => ({
  elencaCertificati: elencaCertificatiMock,
}));
vi.mock("@/lib/nomi-gruppi-atleta", () => ({
  elencaNomiGruppiPerAtletaCorrenti: elencaNomiGruppiPerAtletaCorrentiMock,
}));

const { GET } = await import("./route");

describe("GET /app/conferma-certificati/export (Story 28.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    elencaAtleteMock.mockResolvedValue([
      {
        id: "a1",
        nome: "Rossi Anna",
        codiceFiscale: "RSSANN",
        dataNascita: "2011-05-06T00:00:00.000Z",
      },
    ]);
    elencaCertificatiMock.mockResolvedValue([]);
    elencaNomiGruppiPerAtletaCorrentiMock.mockResolvedValue(new Map());
  });

  it("controlla gli stessi Ruoli della pagina e restituisce il file Excel", async () => {
    requireRuoloMock.mockResolvedValue(null);

    const risposta = await GET();

    expect(requireRuoloMock).toHaveBeenCalledWith(
      ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
      "/app/conferma-certificati"
    );
    expect(risposta.status).toBe(200);
    expect(risposta.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="certificati-\d{4}-\d{4}\.xlsx"$/
    );
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    const contenuto = new TextDecoder().decode(new Uint8Array(await risposta.arrayBuffer()));
    expect(contenuto).toContain("Rossi Anna");
  });

  it("rifiuta con 403 un Ruolo non ammesso, senza leggere dati", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const risposta = await GET();

    expect(risposta.status).toBe(403);
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    expect(elencaAtleteMock).not.toHaveBeenCalled();
    expect(elencaCertificatiMock).not.toHaveBeenCalled();
  });

  it("risponde 500 senza dettagli se la lettura dei dati fallisce", async () => {
    requireRuoloMock.mockResolvedValue(null);
    elencaCertificatiMock.mockRejectedValue(new Error("errore interno del database"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const risposta = await GET();

    expect(risposta.status).toBe(500);
    expect(await risposta.text()).not.toContain("errore interno del database");
  });
});

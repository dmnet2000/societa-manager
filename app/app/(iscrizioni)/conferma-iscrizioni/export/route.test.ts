import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const elencaAtleteMock = vi.fn();
const elencaIscrizioniPerAnnoMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const elencaNomiGruppiPerAtletaCorrentiMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db-rls/atleta", () => ({ elencaAtlete: elencaAtleteMock }));
vi.mock("@/lib/db-rls/iscrizione", () => ({
  elencaIscrizioniPerAnno: elencaIscrizioniPerAnnoMock,
}));
vi.mock("@/lib/anno-agonistico", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anno-agonistico")>()),
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));
vi.mock("@/lib/nomi-gruppi-atleta", () => ({
  elencaNomiGruppiPerAtletaCorrenti: elencaNomiGruppiPerAtletaCorrentiMock,
}));

const { GET } = await import("./route");

describe("GET /app/conferma-iscrizioni/export (Story 28.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    elencaAtleteMock.mockResolvedValue([
      {
        id: "a1",
        nome: "Rossi Anna",
        codiceFiscale: "RSSANN",
        dataNascita: "2011-05-06T00:00:00.000Z",
        categoria: "Under 16",
        email: null,
        cellulare: null,
      },
    ]);
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([
      { id: "i1", atletaId: "a1", confermataIl: "2026-09-15T10:00:00.000Z" },
    ]);
    elencaNomiGruppiPerAtletaCorrentiMock.mockResolvedValue(new Map());
  });

  it("controlla gli stessi Ruoli della pagina e restituisce il file Excel", async () => {
    requireRuoloMock.mockResolvedValue(null);

    const risposta = await GET();

    expect(requireRuoloMock).toHaveBeenCalledWith(
      ["ADMIN", "DIRIGENTE", "SEGRETERIA"],
      "/app/conferma-iscrizioni"
    );
    expect(elencaIscrizioniPerAnnoMock).toHaveBeenCalledWith({}, "anno-1");
    expect(risposta.status).toBe(200);
    expect(risposta.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="iscrizioni-\d{4}-\d{4}\.xlsx"$/
    );
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    const contenuto = new TextDecoder().decode(new Uint8Array(await risposta.arrayBuffer()));
    expect(contenuto).toContain("Rossi Anna");
  });

  it("senza Anno Agonistico corrente nessuna Atleta risulta iscritta", async () => {
    requireRuoloMock.mockResolvedValue(null);
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const risposta = await GET();

    expect(risposta.status).toBe(200);
    expect(elencaIscrizioniPerAnnoMock).not.toHaveBeenCalled();
  });

  it("rifiuta con 403 un Ruolo non ammesso, senza leggere dati", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const risposta = await GET();

    expect(risposta.status).toBe(403);
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    expect(elencaAtleteMock).not.toHaveBeenCalled();
    expect(elencaIscrizioniPerAnnoMock).not.toHaveBeenCalled();
  });

  it("risponde 500 senza dettagli se la lettura dei dati fallisce", async () => {
    requireRuoloMock.mockResolvedValue(null);
    elencaIscrizioniPerAnnoMock.mockRejectedValue(new Error("errore interno del database"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const risposta = await GET();

    expect(risposta.status).toBe(500);
    expect(await risposta.text()).not.toContain("errore interno del database");
  });
});

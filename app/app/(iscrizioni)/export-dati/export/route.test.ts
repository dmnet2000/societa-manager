import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const elencaAnagraficaAtleteExportMock = vi.fn();
const elencaCertificatiMock = vi.fn();
const elencaIscrizioniPerAnnoMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const elencaFederazioniMock = vi.fn();
const federazioniPerAtletaMock = vi.fn();
const elencaNomiGruppiPerAtletaCorrentiMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({ requireRuolo: requireRuoloMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/db-rls/atleta", () => ({
  elencaAnagraficaAtleteExport: elencaAnagraficaAtleteExportMock,
}));
vi.mock("@/lib/db-rls/certificato-medico", () => ({
  elencaCertificati: elencaCertificatiMock,
}));
vi.mock("@/lib/db-rls/iscrizione", () => ({
  elencaIscrizioniPerAnno: elencaIscrizioniPerAnnoMock,
}));
vi.mock("@/lib/anno-agonistico", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anno-agonistico")>()),
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));
vi.mock("@/lib/federazioni", () => ({ elencaFederazioni: elencaFederazioniMock }));
vi.mock("@/lib/tesseramento", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tesseramento")>()),
  federazioniPerAtleta: federazioniPerAtletaMock,
}));
vi.mock("@/lib/nomi-gruppi-atleta", () => ({
  elencaNomiGruppiPerAtletaCorrenti: elencaNomiGruppiPerAtletaCorrentiMock,
}));

const { GET } = await import("./route");

describe("GET /app/export-dati/export (Story 28.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    elencaAnagraficaAtleteExportMock.mockResolvedValue([
      {
        id: "a1",
        nome: "Rossi Anna",
        codiceFiscale: "RSSANN",
        sesso: "F",
        dataNascita: "2011-05-06T00:00:00.000Z",
        luogoNascita: "Treviso",
        provinciaNascita: "TV",
        indirizzo: null,
        cap: null,
        localitaResidenza: null,
        provinciaResidenza: null,
        email: null,
        cellulare: null,
        categoria: null,
        matricola: null,
      },
    ]);
    elencaCertificatiMock.mockResolvedValue([]);
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    elencaIscrizioniPerAnnoMock.mockResolvedValue([]);
    elencaFederazioniMock.mockResolvedValue([
      { id: "f-fipav", nome: "Federazione Italiana Pallavolo", sigla: "FIPAV", attiva: true },
    ]);
    federazioniPerAtletaMock.mockResolvedValue(new Map([["a1", ["f-fipav"]]]));
    elencaNomiGruppiPerAtletaCorrentiMock.mockResolvedValue(new Map());
  });

  it("ammette solo l'Admin e restituisce il file Excel", async () => {
    requireRuoloMock.mockResolvedValue(null);

    const risposta = await GET();

    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"], "/app/export-dati");
    expect(risposta.status).toBe(200);
    expect(risposta.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="export-completo-\d{4}-\d{4}\.xlsx"$/
    );
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    const contenuto = new TextDecoder().decode(new Uint8Array(await risposta.arrayBuffer()));
    expect(contenuto).toContain("Rossi Anna");
    expect(contenuto).toContain("Treviso");
  });

  it("senza Anno Agonistico corrente non legge Iscrizioni ne' Tesseramenti", async () => {
    requireRuoloMock.mockResolvedValue(null);
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const risposta = await GET();

    expect(risposta.status).toBe(200);
    expect(elencaIscrizioniPerAnnoMock).not.toHaveBeenCalled();
    expect(federazioniPerAtletaMock).not.toHaveBeenCalled();
  });

  it("rifiuta con 403 un Ruolo diverso da Admin, senza leggere dati", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const risposta = await GET();

    expect(risposta.status).toBe(403);
    expect(risposta.headers.get("Cache-Control")).toBe("no-store");
    expect(elencaAnagraficaAtleteExportMock).not.toHaveBeenCalled();
    expect(federazioniPerAtletaMock).not.toHaveBeenCalled();
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

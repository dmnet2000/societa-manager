import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const gruppoFindManyMock = vi.fn();
const gruppoAtletaFindManyMock = vi.fn();
const elencaAtleteMock = vi.fn();
const elencaIscrizioniPerAnnoMock = vi.fn();
const etichetteTesseramentoPerAtletaMock = vi.fn();

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    gruppo: { findMany: gruppoFindManyMock },
    gruppoAtleta: { findMany: gruppoAtletaFindManyMock },
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db-rls/atleta", () => ({ elencaAtlete: elencaAtleteMock }));
vi.mock("@/lib/db-rls/iscrizione", () => ({
  elencaIscrizioniPerAnno: elencaIscrizioniPerAnnoMock,
}));
vi.mock("@/lib/tesseramento", () => ({
  etichetteTesseramentoPerAtleta: etichetteTesseramentoPerAtletaMock,
}));
// Aiuto contestuale: cosmetico, irrilevante qui.
vi.mock("@/lib/guida/risolvi-ruoli-pagina", () => ({
  risolviRuoliPerAiutoContestuale: vi.fn(async () => []),
}));
vi.mock("@/app/AiutoContestuale", () => ({
  TitoloPagina: ({ titolo }: { titolo: string }) => <h1>{titolo}</h1>,
}));

const { default: ComposizioneGruppiPage } = await import("./page");

beforeEach(() => {
  vi.clearAllMocks();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  gruppoFindManyMock.mockResolvedValue([{ id: "g1", nome: "Under 14", categoria: "U14" }]);
  gruppoAtletaFindManyMock.mockResolvedValue([
    { gruppoId: "g1", atletaId: "a1" },
    { gruppoId: "g1", atletaId: "a2" },
  ]);
  elencaAtleteMock.mockResolvedValue([
    { id: "a1", nome: "Bianchi Anna" },
    { id: "a2", nome: "Rossi Carla" },
  ]);
  elencaIscrizioniPerAnnoMock.mockResolvedValue([{ id: "i1", atletaId: "a1" }]);
  etichetteTesseramentoPerAtletaMock.mockResolvedValue(new Map([["a1", ["FIPAV", "CSI"]]]));
});

describe("ComposizioneGruppiPage", () => {
  it("mostra un messaggio e non legge alcun dato senza Anno Agonistico corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const html = renderToStaticMarkup(await ComposizioneGruppiPage());

    expect(html).toContain("Nessun Anno Agonistico corrente");
    expect(gruppoFindManyMock).not.toHaveBeenCalled();
    expect(elencaAtleteMock).not.toHaveBeenCalled();
  });

  it("rende la card del Gruppo con riepilogo e badge, leggendo i dati della stagione corrente", async () => {
    const html = renderToStaticMarkup(await ComposizioneGruppiPage());

    // Solo la stagione corrente, e Atlete rimosse escluse (elencaAtlete
    // senza includiRimosse).
    expect(gruppoFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { annoAgonisticoId: "anno-1" } })
    );
    expect(gruppoAtletaFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { annoAgonisticoId: "anno-1" } })
    );
    expect(elencaAtleteMock).toHaveBeenCalledWith(expect.anything());
    expect(elencaIscrizioniPerAnnoMock).toHaveBeenCalledWith(expect.anything(), "anno-1");
    expect(etichetteTesseramentoPerAtletaMock).toHaveBeenCalledWith("anno-1");
    expect(html).toContain("Under 14");
    expect(html).toContain("2 atlete · 1 iscritta · 1 tesserata");
    expect(html).toContain("Tesserata · FIPAV, CSI");
    expect(html).toContain("Non iscritta");
    expect(html).toContain("Non tesserata");
  });

  it("usa il singolare nel riepilogo quando i conteggi valgono 1", async () => {
    gruppoAtletaFindManyMock.mockResolvedValue([{ gruppoId: "g1", atletaId: "a1" }]);
    elencaIscrizioniPerAnnoMock.mockResolvedValue([]);

    const html = renderToStaticMarkup(await ComposizioneGruppiPage());

    expect(html).toContain("1 atleta · 0 iscritte · 1 tesserata");
  });

  it("mostra un messaggio quando la stagione non ha Gruppi", async () => {
    gruppoFindManyMock.mockResolvedValue([]);

    const html = renderToStaticMarkup(await ComposizioneGruppiPage());

    expect(html).toContain("Nessun Gruppo creato per l&#x27;Anno Agonistico corrente.");
  });

  it("mostra il messaggio di Gruppo vuoto", async () => {
    gruppoAtletaFindManyMock.mockResolvedValue([]);

    const html = renderToStaticMarkup(await ComposizioneGruppiPage());

    expect(html).toContain("0 atlete · 0 iscritte · 0 tesserate");
    expect(html).toContain("Nessuna atleta assegnata.");
  });
});

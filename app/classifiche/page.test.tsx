import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const leggiCampionatiConLetturaFipavMock = vi.fn();

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/sincronizza-gare-fipav/leggi-live-fipav", () => ({
  leggiCampionatiConLetturaFipav: leggiCampionatiConLetturaFipavMock,
}));

// Header/Footer pubblici leggono menu/configurazione dal DB - irrilevanti qui.
vi.mock("../HeaderPubblico", () => ({ HeaderPubblico: () => null }));
vi.mock("../FooterPubblico", () => ({ FooterPubblico: () => null }));

const { default: ClassifichePage } = await import("./page");

function riga(squadra: string) {
  return {
    posizione: "1",
    squadra,
    punti: "10",
    partiteGiocate: null,
    partiteVinte: null,
    partitePerse: null,
    setFatti: null,
    setSubiti: null,
    quozienteSet: null,
    puntiFatti: null,
    puntiSubiti: null,
    quozientePunti: null,
    penalizzazione: null,
  };
}

function lettura(id: string, nome: string) {
  return {
    campionato: { id, nome, colore: null, gruppo: { nome: "Squadra " + nome } },
    lettura: { risultati: [], classifica: [riga("Alfa")] },
  };
}

beforeEach(() => {
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  leggiCampionatiConLetturaFipavMock.mockReset();
  leggiCampionatiConLetturaFipavMock.mockResolvedValue([]);
});

// Story 19.17: /classifiche legge solo le classifiche visibili, nell'ordine
// restituito dal helper (ordine squadre).
describe("ClassifichePage", () => {
  it("chiede al helper solo le classifiche visibili della stagione corrente", async () => {
    await ClassifichePage();

    expect(leggiCampionatiConLetturaFipavMock).toHaveBeenCalledWith("anno-1", {
      soloClassificheVisibili: true,
    });
  });

  it("mostra il messaggio vuoto se nessuna classifica e' visibile", async () => {
    const html = renderToStaticMarkup(await ClassifichePage());

    expect(html).toContain("Nessuna classifica disponibile al momento.");
  });

  it("rende le classifiche nell'ordine restituito dal helper", async () => {
    leggiCampionatiConLetturaFipavMock.mockResolvedValue([
      lettura("c2", "U14 A"),
      lettura("c1", "Serie D"),
    ]);

    const html = renderToStaticMarkup(await ClassifichePage());

    expect(html).not.toContain("Nessuna classifica disponibile al momento.");
    const posU14 = html.indexOf("U14 A");
    const posSerieD = html.indexOf("Serie D");
    expect(posU14).toBeGreaterThan(-1);
    expect(posSerieD).toBeGreaterThan(posU14);
  });

  it("non chiama il helper senza stagione corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    await ClassifichePage();

    expect(leggiCampionatiConLetturaFipavMock).not.toHaveBeenCalled();
  });
});

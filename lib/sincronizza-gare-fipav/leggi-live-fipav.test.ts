import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const analizzaHtmlGareFipavMock = vi.fn();
const analizzaHtmlClassificaFipavMock = vi.fn();
const fetchMock = vi.fn();
const unstableCacheMock = vi.fn();

vi.mock("@/lib/sincronizza-gare-fipav/parser", () => ({
  analizzaHtmlGareFipav: analizzaHtmlGareFipavMock,
  analizzaHtmlClassificaFipav: analizzaHtmlClassificaFipavMock,
}));

// Review fix (Verification Gap Reviewer): la home pubblica ha
// `dynamic = "force-dynamic"`, che rende inefficace l'opzione
// next.revalidate di un fetch - la cache breve e' ora delegata a
// unstable_cache (next/cache), un livello indipendente. Mockato per
// verificarne l'uso corretto (funzione/chiave/opzioni) senza dipendere
// dalla vera Data Cache di Next.js (non disponibile fuori da un runtime
// Next.js reale, stesso principio gia' in uso altrove per revalidatePath).
// Pass-through: invoca subito la funzione data, ignorando keyParts/options,
// cosi' il comportamento di fetch/parsing sotto resta testabile invariato.
unstableCacheMock.mockImplementation(
  (fn: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) =>
      fn(...args)
);
vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.stubGlobal("fetch", fetchMock);

const { leggiLiveFipav, REVALIDATE_SECONDI_DEFAULT } = await import("./leggi-live-fipav");

function buildResponse(ok: boolean, status: number, html: string) {
  return { ok, status, text: async () => html };
}

const RIGA_GARA = {
  garaNumero: "1568",
  giornata: "1",
  data: "2025-10-25",
  ora: "20:30",
  squadraCasa: "VOLLEY MOGLIANO",
  squadraOspite: "SPACCIO OCCHIALI VISION",
  risultato: "3 - 0",
  parziali: "25-19,29-27,25-21",
  statoDescrizione: "Gara omologata",
  impianto: "Palestra Olme",
  indirizzoImpianto: "Mogliano Veneto TV, Via Olme 12",
};

const RIGA_CLASSIFICA = {
  posizione: "1",
  squadra: "VOLLEY MOGLIANO",
  punti: "24",
  partiteGiocate: "10",
  partiteVinte: "8",
  partitePerse: "2",
  setFatti: "26",
  setSubiti: "10",
  quozienteSet: "2.60",
  puntiFatti: "650",
  puntiSubiti: "520",
  quozientePunti: "1.25",
  penalizzazione: "0",
};

describe("leggiLiveFipav", () => {
  beforeEach(() => {
    // mockClear (non mockReset): preserva il pass-through impostato sopra,
    // azzera solo il conteggio/argomenti delle chiamate tra un test e l'altro.
    unstableCacheMock.mockClear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(buildResponse(true, 200, "<html></html>"));
    analizzaHtmlGareFipavMock.mockReset();
    analizzaHtmlGareFipavMock.mockReturnValue({ righe: [RIGA_GARA], scartate: [] });
    analizzaHtmlClassificaFipavMock.mockReset();
    analizzaHtmlClassificaFipavMock.mockReturnValue([RIGA_CLASSIFICA]);
  });

  it("fetches with the same config as sincronizzaGareFipav (redirect/timeout/User-Agent)", async () => {
    await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://risultati.fipav.it/campionato/1",
      expect.objectContaining({
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SocietaManagerBot/1.0)" },
      })
    );
  });

  // Review fix: la cache breve e' delegata a unstable_cache (non piu' a
  // un'opzione next.revalidate sul fetch, inefficace sotto force-dynamic -
  // vedi commento in leggi-live-fipav.ts) - qui si verifica che
  // unstable_cache riceva la finestra di revalidate corretta (di default o
  // personalizzata) e una chiave che include la URL, non che fetch stesso
  // riceva un'opzione cache.
  it("wraps the read in unstable_cache with the default revalidate window, keyed on the linkFipav", async () => {
    await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["https://risultati.fipav.it/campionato/1"],
      { revalidate: REVALIDATE_SECONDI_DEFAULT }
    );
  });

  it("uses a custom revalidate window when provided", async () => {
    await leggiLiveFipav("https://risultati.fipav.it/campionato/1", 60);

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["https://risultati.fipav.it/campionato/1"],
      { revalidate: 60 }
    );
  });

  it("returns risultati and classifica parsed from the same fetched HTML on success", async () => {
    const risultato = await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(risultato).toEqual({
      risultati: [RIGA_GARA],
      classifica: [RIGA_CLASSIFICA],
    });
  });

  it("returns null, never throws, when the fetch responds with a non-ok status", async () => {
    fetchMock.mockResolvedValue(buildResponse(false, 503, ""));

    const risultato = await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(risultato).toBeNull();
    expect(analizzaHtmlGareFipavMock).not.toHaveBeenCalled();
  });

  it("returns null, never throws, when the fetch rejects (network error/timeout)", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));

    const risultato = await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(risultato).toBeNull();
    expect(analizzaHtmlGareFipavMock).not.toHaveBeenCalled();
  });

  it("returns null, never throws, when tbl-risultati is missing (page format changed)", async () => {
    analizzaHtmlGareFipavMock.mockImplementation(() => {
      throw new Error("Tabella dei risultati non trovata");
    });

    const risultato = await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(risultato).toBeNull();
  });

  it("returns null, never throws, when tbl-classifica is missing (page format changed) even though tbl-risultati parsed fine", async () => {
    analizzaHtmlClassificaFipavMock.mockImplementation(() => {
      throw new Error("Tabella della classifica non trovata");
    });

    const risultato = await leggiLiveFipav("https://risultati.fipav.it/campionato/1");

    expect(risultato).toBeNull();
  });
});

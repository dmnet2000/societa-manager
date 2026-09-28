import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const analizzaHtmlGareFipavMock = vi.fn();
const analizzaHtmlClassificaFipavMock = vi.fn();
const fetchMock = vi.fn();
const unstableCacheMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/lib/sincronizza-gare-fipav/parser", () => ({
  analizzaHtmlGareFipav: analizzaHtmlGareFipavMock,
  analizzaHtmlClassificaFipav: analizzaHtmlClassificaFipavMock,
}));

// Story 18.34: leggiCampionatiConLetturaFipav (nuova funzione condivisa,
// estratta da app/page.tsx) usa prisma.campionato.findMany - stesso pattern
// di mock gia' in uso altrove nel progetto per query Prisma dentro un test
// (es. app/api/cron/sincronizza-fipav/route.test.ts).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campionato: { findMany: findManyMock },
  },
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

const { leggiLiveFipav, leggiCampionatiConLetturaFipav, REVALIDATE_SECONDI_DEFAULT } =
  await import("./leggi-live-fipav");

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

// Story 18.34: beforeEach a livello di modulo (non piu' annidato nel solo
// describe("leggiLiveFipav")) - condiviso anche da
// describe("leggiCampionatiConLetturaFipav") sotto, stessi default
// fetch/parsing per entrambe le funzioni (che condividono la stessa
// implementazione di fetch/parsing sotto, Design Notes spec-18-34).
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
  findManyMock.mockReset();
});

describe("leggiLiveFipav", () => {
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

function campionato(overrides: Partial<{
  id: string;
  nome: string;
  colore: string | null;
  linkFipav: string | null;
  gruppo: { nome: string };
}> = {}) {
  return {
    id: "campionato-1",
    nome: "Serie C Girone A",
    colore: "#2E6F99",
    linkFipav: "https://risultati.fipav.it/campionato/1",
    gruppo: { nome: "Prima Squadra" },
    ...overrides,
  };
}

// Story 18.34: unica implementazione della query+fetch, condivisa da
// app/page.tsx e app/classifiche/page.tsx - testata qui una sola volta,
// entrambi i chiamanti ne ereditano lo stesso comportamento verificato
// (nessuna seconda copia della logica da testare separatamente).
describe("leggiCampionatiConLetturaFipav", () => {
  it("queries Campionato scoped to the season, with linkFipav not null, ordered by nome", async () => {
    findManyMock.mockResolvedValue([]);

    await leggiCampionatiConLetturaFipav("anno-1");

    expect(findManyMock).toHaveBeenCalledWith({
      where: { annoAgonisticoId: "anno-1", linkFipav: { not: null } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        colore: true,
        linkFipav: true,
        gruppo: { select: { nome: true } },
      },
    });
  });

  it("returns a lettura per Campionato found, fetched in parallel", async () => {
    findManyMock.mockResolvedValue([
      campionato({ id: "a", linkFipav: "https://risultati.fipav.it/a" }),
      campionato({ id: "b", nome: "Under 16", linkFipav: "https://risultati.fipav.it/b" }),
    ]);

    const risultato = await leggiCampionatiConLetturaFipav("anno-1");

    expect(risultato).toHaveLength(2);
    expect(risultato[0].campionato.id).toBe("a");
    expect(risultato[0].lettura).toEqual({
      risultati: [RIGA_GARA],
      classifica: [RIGA_CLASSIFICA],
    });
    expect(risultato[1].campionato.id).toBe("b");
  });

  it("omits no Campionato from the array when one fetch fails - lettura is null for that one, others unaffected (fail-soft per Campionato)", async () => {
    findManyMock.mockResolvedValue([
      campionato({ id: "a", linkFipav: "https://risultati.fipav.it/a" }),
      campionato({ id: "b", linkFipav: "https://risultati.fipav.it/b" }),
    ]);
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "https://risultati.fipav.it/a") {
        throw new Error("network error");
      }
      return buildResponse(true, 200, "<html></html>");
    });

    const risultato = await leggiCampionatiConLetturaFipav("anno-1");

    expect(risultato).toHaveLength(2);
    expect(risultato.find((r) => r.campionato.id === "a")?.lettura).toBeNull();
    expect(risultato.find((r) => r.campionato.id === "b")?.lettura).toEqual({
      risultati: [RIGA_GARA],
      classifica: [RIGA_CLASSIFICA],
    });
  });

  it("returns an empty array when no Campionato has linkFipav set (matrice I/O riga 4)", async () => {
    findManyMock.mockResolvedValue([]);

    const risultato = await leggiCampionatiConLetturaFipav("anno-1");

    expect(risultato).toEqual([]);
  });
});

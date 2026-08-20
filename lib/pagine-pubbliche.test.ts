import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const findUniqueMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paginaPubblica: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

// Code review (Verification Gap + Blind Hunter): mockata (non la vera
// isomorphic-dompurify) per testare in isolamento che
// contenutoSanitizzatoPaginaPubblica DELEGA a sanitizzaHtml - lib/sanitizza-html.test.ts
// copre gia' a fondo cosa sanitizzaHtml() stessa rimuove/mantiene, nessuna
// duplicazione di quella copertura qui.
const sanitizzaHtmlMock = vi.fn((html: string) => `SICURO(${html})`);
vi.mock("@/lib/sanitizza-html", () => ({
  sanitizzaHtml: sanitizzaHtmlMock,
}));

const {
  elencaPaginePubbliche,
  trovaPaginaPubblicaPerSlug,
  trovaPaginaPubblicaPerId,
  creaPaginaPubblica,
  aggiornaPaginaPubblica,
  eliminaPaginaPubblica,
  contenutoSanitizzatoPaginaPubblica,
} = await import("./pagine-pubbliche");

beforeEach(() => {
  findManyMock.mockReset();
  findUniqueMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("elencaPaginePubbliche", () => {
  it("returns all rows ordered by titolo ascending", async () => {
    const righe = [{ id: "1", titolo: "Storia" }];
    findManyMock.mockResolvedValue(righe);

    const result = await elencaPaginePubbliche();

    expect(findManyMock).toHaveBeenCalledWith({ orderBy: { titolo: "asc" } });
    expect(result).toBe(righe);
  });
});

describe("trovaPaginaPubblicaPerSlug", () => {
  it("looks up by slug", async () => {
    const riga = { id: "1", slug: "/storia-societa", titolo: "Storia" };
    findUniqueMock.mockResolvedValue(riga);

    const result = await trovaPaginaPubblicaPerSlug("/storia-societa");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { slug: "/storia-societa" },
    });
    expect(result).toBe(riga);
  });

  it("returns null when no PaginaPubblica matches the slug", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await trovaPaginaPubblicaPerSlug("/inesistente");

    expect(result).toBeNull();
  });
});

// Story 19.10: usata dalla pagina di modifica per precaricare l'editor e
// dall'azione di aggiornamento per confrontare lo slug inviato con quello
// gia' salvato (esenzione da rottaRiservata() sullo slug invariato, mirror
// di trovaVoceMenuPubblicoPerId, Story 19.9 review fix).
describe("trovaPaginaPubblicaPerId", () => {
  it("looks up by id", async () => {
    const riga = { id: "1", slug: "/storia-societa", titolo: "Storia" };
    findUniqueMock.mockResolvedValue(riga);

    const result = await trovaPaginaPubblicaPerId("1");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(result).toBe(riga);
  });

  it("returns null when no PaginaPubblica matches the id", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await trovaPaginaPubblicaPerId("inesistente");

    expect(result).toBeNull();
  });
});

// Story 19.10: nessuna validazione qui (lunghezza titolo, formato/riserva
// dello slug, sanitizzazione) - vive nel Server Action che chiama queste
// funzioni (pagine-pubbliche/actions.ts), stessa separazione di livelli gia'
// stabilita da lib/menu-pubblico.ts.
describe("creaPaginaPubblica", () => {
  it("creates a row with the given data", async () => {
    const dati = { titolo: "Chi siamo", slug: "/chi-siamo", contenutoHtml: "<p>Testo</p>" };
    const nuovaRiga = { id: "nuovo", ...dati };
    createMock.mockResolvedValue(nuovaRiga);

    const result = await creaPaginaPubblica(dati);

    expect(createMock).toHaveBeenCalledWith({ data: dati });
    expect(result).toBe(nuovaRiga);
  });
});

describe("aggiornaPaginaPubblica", () => {
  it("updates titolo/slug/contenutoHtml by id", async () => {
    const dati = { titolo: "Nuovo", slug: "/nuovo", contenutoHtml: "<p>Nuovo</p>" };

    await aggiornaPaginaPubblica("p1", dati);

    expect(updateMock).toHaveBeenCalledWith({ where: { id: "p1" }, data: dati });
  });
});

describe("eliminaPaginaPubblica", () => {
  it("deletes by id (hard delete, nessuno stato bozza/soft-delete)", async () => {
    await eliminaPaginaPubblica("p1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

// Code review (Verification Gap + Blind Hunter, indipendentemente): il
// finding piu' grave delle 3 review - senza questo test, sostituire
// app/[...slug]/page.tsx con `pagina.contenutoHtml` grezzo (bypassando la
// sanitizzazione al render, seconda difesa in profondita' della storia)
// avrebbe lasciato l'intera suite Vitest verde.
describe("contenutoSanitizzatoPaginaPubblica", () => {
  it("passa il contenuto grezzo attraverso sanitizzaHtml, non lo restituisce invariato", () => {
    const pericoloso = '<p>Testo</p><script>alert(1)</script>';

    const result = contenutoSanitizzatoPaginaPubblica({ contenutoHtml: pericoloso });

    expect(sanitizzaHtmlMock).toHaveBeenCalledWith(pericoloso);
    expect(result).toBe(`SICURO(${pericoloso})`);
    expect(result).not.toBe(pericoloso);
  });
});

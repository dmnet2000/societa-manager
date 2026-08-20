import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paginaPubblica: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
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
  contenutoSanitizzatoPaginaPubblica,
} = await import("./pagine-pubbliche");

beforeEach(() => {
  findManyMock.mockReset();
  findUniqueMock.mockReset();
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

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    configurazioneApplicazione: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

const {
  leggiNomeSettore,
  salvaNomeSettore,
  leggiEmailSegreteria,
  salvaEmailSegreteria,
  leggiUrlPaginaFacebook,
  salvaUrlPaginaFacebook,
  ID_CONFIGURAZIONE_APPLICAZIONE,
} = await import("./configurazione-applicazione");

describe("leggiNomeSettore", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored nomeSettore", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: "Volley" });

    const result = await leggiNomeSettore();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { nomeSettore: true },
    });
    expect(result).toBe("Volley");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiNomeSettore();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ nomeSettore: null });

    const result = await leggiNomeSettore();

    expect(result).toBeNull();
  });
});

describe("salvaNomeSettore", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaNomeSettore("Volley");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore: "Volley" },
      update: { nomeSettore: "Volley" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaNomeSettore(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore: null },
      update: { nomeSettore: null },
    });
  });
});

// Story 9.31: mirror esatto dei describe sopra per leggiNomeSettore/salvaNomeSettore.
describe("leggiEmailSegreteria", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored emailSegreteria", async () => {
    findUniqueMock.mockResolvedValue({ emailSegreteria: "segreteria@esempio.it" });

    const result = await leggiEmailSegreteria();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { emailSegreteria: true },
    });
    expect(result).toBe("segreteria@esempio.it");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiEmailSegreteria();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ emailSegreteria: null });

    const result = await leggiEmailSegreteria();

    expect(result).toBeNull();
  });
});

describe("salvaEmailSegreteria", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaEmailSegreteria("segreteria@esempio.it");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: "segreteria@esempio.it" },
      update: { emailSegreteria: "segreteria@esempio.it" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaEmailSegreteria(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: null },
      update: { emailSegreteria: null },
    });
  });
});

// Story 18.5: mirror esatto dei describe sopra per leggiEmailSegreteria/salvaEmailSegreteria.
describe("leggiUrlPaginaFacebook", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the stored urlPaginaFacebook", async () => {
    findUniqueMock.mockResolvedValue({
      urlPaginaFacebook: "https://www.facebook.com/miasocieta",
    });

    const result = await leggiUrlPaginaFacebook();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      select: { urlPaginaFacebook: true },
    });
    expect(result).toBe("https://www.facebook.com/miasocieta");
  });

  it("returns null when no row exists yet (mai salvato)", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await leggiUrlPaginaFacebook();

    expect(result).toBeNull();
  });

  it("returns null when the stored value is null", async () => {
    findUniqueMock.mockResolvedValue({ urlPaginaFacebook: null });

    const result = await leggiUrlPaginaFacebook();

    expect(result).toBeNull();
  });
});

describe("salvaUrlPaginaFacebook", () => {
  beforeEach(() => {
    upsertMock.mockReset();
  });

  it("upserts on the fixed id, atomic - no read-then-branch", async () => {
    await salvaUrlPaginaFacebook("https://www.facebook.com/miasocieta");

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: {
        id: ID_CONFIGURAZIONE_APPLICAZIONE,
        urlPaginaFacebook: "https://www.facebook.com/miasocieta",
      },
      update: { urlPaginaFacebook: "https://www.facebook.com/miasocieta" },
    });
  });

  it("allows clearing the value back to null", async () => {
    await salvaUrlPaginaFacebook(null);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
      create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, urlPaginaFacebook: null },
      update: { urlPaginaFacebook: null },
    });
  });
});

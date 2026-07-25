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

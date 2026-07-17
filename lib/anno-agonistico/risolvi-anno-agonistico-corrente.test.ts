import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findFirstMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    annoAgonistico: { findFirst: findFirstMock, create: createMock },
  },
}));

const { trovaAnnoAgonisticoCorrente, risolviAnnoAgonisticoCorrente } =
  await import("./risolvi-anno-agonistico-corrente");

describe("trovaAnnoAgonisticoCorrente", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    createMock.mockReset();
  });

  it("returns the existing AnnoAgonistico containing today, without creating anything", async () => {
    const esistente = {
      id: "anno-1",
      dataInizio: new Date(Date.UTC(2025, 7, 1)),
      dataFine: new Date(Date.UTC(2026, 5, 30)),
    };
    findFirstMock.mockResolvedValue(esistente);

    const oggi = new Date(Date.UTC(2026, 2, 10));
    const result = await trovaAnnoAgonisticoCorrente(oggi);

    expect(result).toEqual(esistente);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns null when no AnnoAgonistico exists yet for today", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await trovaAnnoAgonisticoCorrente(new Date(Date.UTC(2026, 2, 10)));

    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("risolviAnnoAgonisticoCorrente", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    createMock.mockReset();
  });

  it("returns the existing AnnoAgonistico without creating a new one", async () => {
    const esistente = {
      id: "anno-1",
      dataInizio: new Date(Date.UTC(2025, 7, 1)),
      dataFine: new Date(Date.UTC(2026, 5, 30)),
    };
    findFirstMock.mockResolvedValue(esistente);

    const result = await risolviAnnoAgonisticoCorrente(new Date(Date.UTC(2026, 2, 10)));

    expect(result).toEqual(esistente);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a new AnnoAgonistico when none exists yet for today (AC #3)", async () => {
    findFirstMock.mockResolvedValue(null);
    const creato = {
      id: "anno-nuovo",
      dataInizio: new Date(Date.UTC(2025, 7, 1)),
      dataFine: new Date(Date.UTC(2026, 5, 30)),
    };
    createMock.mockResolvedValue(creato);

    const result = await risolviAnnoAgonisticoCorrente(new Date(Date.UTC(2026, 2, 10)));

    expect(createMock).toHaveBeenCalledWith({
      data: {
        dataInizio: new Date(Date.UTC(2025, 7, 1)),
        dataFine: new Date(Date.UTC(2026, 5, 30)),
      },
    });
    expect(result).toEqual(creato);
  });

  it("re-fetches instead of throwing when a concurrent call already created it (race condition)", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    createMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );
    const creataDallAltraChiamata = {
      id: "anno-concorrente",
      dataInizio: new Date(Date.UTC(2025, 7, 1)),
      dataFine: new Date(Date.UTC(2026, 5, 30)),
    };
    findFirstMock.mockResolvedValueOnce(creataDallAltraChiamata);

    const result = await risolviAnnoAgonisticoCorrente(new Date(Date.UTC(2026, 2, 10)));

    expect(result).toEqual(creataDallAltraChiamata);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("propagates any other create error", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error("db down"));

    await expect(
      risolviAnnoAgonisticoCorrente(new Date(Date.UTC(2026, 2, 10)))
    ).rejects.toThrow("db down");
  });
});

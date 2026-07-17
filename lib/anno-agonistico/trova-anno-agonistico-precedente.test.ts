import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    annoAgonistico: { findFirst: findFirstMock },
  },
}));

const { trovaAnnoAgonisticoPrecedente } = await import(
  "./trova-anno-agonistico-precedente"
);

const annoCorrente = {
  id: "anno-corrente",
  dataInizio: new Date(Date.UTC(2026, 7, 1)),
  dataFine: new Date(Date.UTC(2027, 5, 30)),
};

describe("trovaAnnoAgonisticoPrecedente", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns the AnnoAgonistico immediately preceding the current one", async () => {
    const precedente = {
      id: "anno-precedente",
      dataInizio: new Date(Date.UTC(2025, 7, 1)),
      dataFine: new Date(Date.UTC(2026, 5, 30)),
    };
    findFirstMock.mockResolvedValue(precedente);

    const result = await trovaAnnoAgonisticoPrecedente(annoCorrente);

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { dataFine: { lt: annoCorrente.dataInizio } },
      orderBy: { dataFine: "desc" },
    });
    expect(result).toEqual(precedente);
  });

  it("returns null when no previous AnnoAgonistico exists (first ever season, AC #5)", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await trovaAnnoAgonisticoPrecedente(annoCorrente);

    expect(result).toBeNull();
  });
});

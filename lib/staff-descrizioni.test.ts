import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const updateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    allenatore: {
      update: updateMock,
    },
  },
}));

const { aggiornaDescrizioneStaff } = await import("./staff-descrizioni");

beforeEach(() => {
  updateMock.mockReset();
  updateMock.mockResolvedValue(undefined);
});

describe("aggiornaDescrizioneStaff", () => {
  it("updates descrizione/ruoliAggiuntivi by id", async () => {
    await aggiornaDescrizioneStaff("a1", {
      descrizione: "Allena da 10 anni",
      ruoliAggiuntivi: ["Team Manager", "Segretario"],
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        descrizione: "Allena da 10 anni",
        ruoliAggiuntivi: ["Team Manager", "Segretario"],
      },
    });
  });

  it("passa descrizione null e ruoliAggiuntivi vuoto invariati (nessuna trasformazione qui)", async () => {
    await aggiornaDescrizioneStaff("a1", { descrizione: null, ruoliAggiuntivi: [] });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { descrizione: null, ruoliAggiuntivi: [] },
    });
  });

  it("propaga l'errore di Prisma senza catturarlo (nessuna validazione qui, mirror di menu-pubblico.ts)", async () => {
    updateMock.mockRejectedValue(new Error("db down"));

    await expect(
      aggiornaDescrizioneStaff("a1", { descrizione: null, ruoliAggiuntivi: [] })
    ).rejects.toThrow("db down");
  });
});

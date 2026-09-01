import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { precaricamentoRuolo: { findUnique: findUniqueMock } },
}));

const { trovaPrecaricamentoRuolo } = await import("./trova-precaricamento-ruolo");

describe("trovaPrecaricamentoRuolo", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the PrecaricamentoRuolo when a match is found", async () => {
    const riga = { id: "p1", email: "mario@example.com", ruolo: "SEGRETERIA", utenteId: null };
    findUniqueMock.mockResolvedValue(riga);

    const result = await trovaPrecaricamentoRuolo("mario@example.com", "SEGRETERIA");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email_ruolo: { email: "mario@example.com", ruolo: "SEGRETERIA" } },
    });
    expect(result).toEqual(riga);
  });

  it("returns null when no match is found", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await trovaPrecaricamentoRuolo("sconosciuto@example.com", "DIRIGENTE");

    expect(result).toBeNull();
  });

  it("normalizes the email (trim + lowercase) before matching", async () => {
    findUniqueMock.mockResolvedValue(null);

    await trovaPrecaricamentoRuolo("  Mario@Example.COM  ", "SEGRETERIA");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email_ruolo: { email: "mario@example.com", ruolo: "SEGRETERIA" } },
    });
  });
});

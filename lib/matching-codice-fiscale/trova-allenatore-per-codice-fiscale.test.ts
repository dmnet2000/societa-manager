import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { allenatore: { findUnique: findUniqueMock } },
}));

const { trovaAllenatorePerCodiceFiscale } = await import(
  "./trova-allenatore-per-codice-fiscale"
);

describe("trovaAllenatorePerCodiceFiscale", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns the Allenatore when a match is found", async () => {
    const allenatore = { id: "a1", codiceFiscale: "ABC123", utenteId: null };
    findUniqueMock.mockResolvedValue(allenatore);

    const result = await trovaAllenatorePerCodiceFiscale("ABC123");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { codiceFiscale: "ABC123" },
    });
    expect(result).toEqual(allenatore);
  });

  it("returns null when no match is found", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await trovaAllenatorePerCodiceFiscale("SCONOSCIUTO");

    expect(result).toBeNull();
  });

  it("normalizes the Codice Fiscale (trim + uppercase) before matching", async () => {
    findUniqueMock.mockResolvedValue(null);

    await trovaAllenatorePerCodiceFiscale("  abc123  ");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { codiceFiscale: "ABC123" },
    });
  });
});

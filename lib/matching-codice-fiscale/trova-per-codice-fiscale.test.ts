import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

const supabase = { from: fromMock } as never;

const { trovaPerCodiceFiscale } = await import("./trova-per-codice-fiscale");

describe("trovaPerCodiceFiscale", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    singleMock.mockReset();
  });

  it("returns the Atleta when a match is found", async () => {
    const atleta = { id: "a1", codiceFiscale: "ABC123" };
    singleMock.mockResolvedValue({ data: atleta, error: null });

    const result = await trovaPerCodiceFiscale(supabase, "ABC123");

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(eqMock).toHaveBeenCalledWith("codiceFiscale", "ABC123");
    expect(result).toEqual(atleta);
  });

  it("returns null when no match is found", async () => {
    singleMock.mockResolvedValue({ data: null, error: null });

    const result = await trovaPerCodiceFiscale(supabase, "SCONOSCIUTO");

    expect(result).toBeNull();
  });

  it("throws when the query fails", async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: "db down" } });

    await expect(trovaPerCodiceFiscale(supabase, "ABC123")).rejects.toThrow(
      "db down"
    );
  });

  it("normalizes the Codice Fiscale (trim + uppercase) before matching (review fix)", async () => {
    singleMock.mockResolvedValue({ data: null, error: null });

    await trovaPerCodiceFiscale(supabase, "  abc123  ");

    expect(eqMock).toHaveBeenCalledWith("codiceFiscale", "ABC123");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyOtpMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { verifyOtp: verifyOtpMock },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { confermaRegistrazione } = await import("./actions");

describe("confermaRegistrazione", () => {
  beforeEach(() => {
    verifyOtpMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns a clear error when the token is missing, no Supabase call", async () => {
    const result = await confermaRegistrazione("", undefined, new FormData());

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di conferma non valido o scaduto. Registrati di nuovo.",
      },
    });
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when verifyOtp fails (expired/invalid/already used token)", async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Token has expired" },
    });

    const result = await confermaRegistrazione(
      "token-scaduto",
      undefined,
      new FormData()
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di conferma non valido o scaduto. Registrati di nuovo.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when verifyOtp throws unexpectedly", async () => {
    verifyOtpMock.mockRejectedValue(new Error("network down"));

    const result = await confermaRegistrazione(
      "token-valido",
      undefined,
      new FormData()
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di conferma non valido o scaduto. Registrati di nuovo.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /app when the token is valid (session established by verifyOtp)", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });

    await expect(
      confermaRegistrazione("token-valido", undefined, new FormData())
    ).rejects.toThrow("REDIRECT");

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "token-valido",
      type: "signup",
    });
    expect(redirectMock).toHaveBeenCalledWith("/app");
  });
});

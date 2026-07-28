import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyOtpMock = vi.fn();
const updateUserMock = vi.fn();
const signOutMock = vi.fn();
const findUniqueMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { verifyOtp: verifyOtpMock, updateUser: updateUserMock, signOut: signOutMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { utente: { findUnique: findUniqueMock } },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { reimpostaPassword } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

describe("reimpostaPassword", () => {
  beforeEach(() => {
    verifyOtpMock.mockReset();
    updateUserMock.mockReset();
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    findUniqueMock.mockReset();
    findUniqueMock.mockResolvedValue({ attivo: true });
    redirectMock.mockClear();
  });

  it("returns a validation error when the new password is too short, no Supabase call", async () => {
    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "corta1", confermaPassword: "corta1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
      },
    });
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the confirmation does not match, no Supabase call", async () => {
    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password2" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La conferma non coincide con la nuova password.",
      },
    });
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when the token is missing, no Supabase call", async () => {
    const result = await reimpostaPassword(
      "",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di recupero non valido o scaduto. Richiedine uno nuovo.",
      },
    });
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when verifyOtp fails (expired/invalid/already used token)", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: null }, error: { message: "Token has expired" } });

    const result = await reimpostaPassword(
      "token-scaduto",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di recupero non valido o scaduto. Richiedine uno nuovo.",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a clear error when verifyOtp succeeds without error but returns no user (defensive)", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: null }, error: null });

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di recupero non valido o scaduto. Richiedine uno nuovo.",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when verifyOtp throws unexpectedly", async () => {
    verifyOtpMock.mockRejectedValue(new Error("network down"));

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "TOKEN_NON_VALIDO",
        message: "Link di recupero non valido o scaduto. Richiedine uno nuovo.",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns ACCOUNT_DISATTIVATO and signs out when the Utente is deactivated (Story 1.2 gate, review fix)", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });
    findUniqueMock.mockResolvedValue({ attivo: false });

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "ACCOUNT_DISATTIVATO",
        message: "Account disattivato. Contatta la segreteria.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns ACCOUNT_DISATTIVATO and signs out when no matching Utente row is found (fail-closed)", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });
    findUniqueMock.mockResolvedValue(null);

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "ACCOUNT_DISATTIVATO",
        message: "Account disattivato. Contatta la segreteria.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, signs out, when the attivo check itself throws, no crash", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });
    findUniqueMock.mockRejectedValue(new Error("db down"));

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns an AUTH_ERROR when updateUser fails after a valid token", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });
    updateUserMock.mockResolvedValue({ error: { message: "unexpected" } });

    const result = await reimpostaPassword(
      "token-valido",
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({
      error: {
        code: "AUTH_ERROR",
        message: "Impossibile aggiornare la password. Riprova.",
      },
    });
  });

  it("redirects to /accedi when the token is valid, the Utente is active, and the password is updated", async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: "auth-u1" } }, error: null });
    updateUserMock.mockResolvedValue({ error: null });

    await expect(
      reimpostaPassword(
        "token-valido",
        undefined,
        buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
      )
    ).rejects.toThrow("REDIRECT");

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "token-valido",
      type: "recovery",
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { supabaseAuthId: "auth-u1" },
      select: { attivo: true },
    });
    expect(updateUserMock).toHaveBeenCalledWith({ password: "password1" });
    expect(redirectMock).toHaveBeenCalledWith("/accedi");
  });
});

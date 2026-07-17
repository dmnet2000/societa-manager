import { describe, expect, it, vi, beforeEach } from "vitest";

const signInMock = vi.fn();
const signOutMock = vi.fn();
const findUniqueMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: signInMock, signOut: signOutMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { utente: { findUnique: findUniqueMock } },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { accedi } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

describe("accedi", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    findUniqueMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns an error when fields are missing", async () => {
    const result = await accedi(undefined, buildFormData({ email: "" }));
    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Email e password sono obbligatorie.",
      },
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("returns a clear error on invalid credentials (AC #3), no crash", async () => {
    signInMock.mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });

    const result = await accedi(
      undefined,
      buildFormData({ email: "a@example.com", password: "wrong" })
    );

    expect(result).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Credenziali non valide. Riprova.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error when signInWithPassword throws unexpectedly, no crash", async () => {
    signInMock.mockRejectedValue(new Error("network down"));

    const result = await accedi(
      undefined,
      buildFormData({ email: "a@example.com", password: "wrong" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to the app area on success (AC #2)", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    findUniqueMock.mockResolvedValue({ attivo: true });

    await expect(
      accedi(
        undefined,
        buildFormData({ email: "a@example.com", password: "right" })
      )
    ).rejects.toThrow("REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("blocks login and signs out when the Utente is deactivated (Story 1.2 AC #3)", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    findUniqueMock.mockResolvedValue({ attivo: false });

    const result = await accedi(
      undefined,
      buildFormData({ email: "disattivato@example.com", password: "right" })
    );

    expect(result).toEqual({
      error: {
        code: "ACCOUNT_DISATTIVATO",
        message: "Account disattivato. Contatta la segreteria.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("blocks login (fail-closed) when no matching Utente row is found", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u3" } }, error: null });
    findUniqueMock.mockResolvedValue(null);

    const result = await accedi(
      undefined,
      buildFormData({ email: "senza-utente@example.com", password: "right" })
    );

    expect(result).toEqual({
      error: {
        code: "ACCOUNT_DISATTIVATO",
        message: "Account disattivato. Contatta la segreteria.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, signs out, when the attivo check itself fails, no crash", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u4" } }, error: null });
    findUniqueMock.mockRejectedValue(new Error("db down"));

    const result = await accedi(
      undefined,
      buildFormData({ email: "a@example.com", password: "right" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not crash when signOut itself throws inside the catch block", async () => {
    signInMock.mockResolvedValue({ data: { user: { id: "u5" } }, error: null });
    findUniqueMock.mockRejectedValue(new Error("db down"));
    signOutMock.mockRejectedValue(new Error("signout also down"));

    const result = await accedi(
      undefined,
      buildFormData({ email: "a@example.com", password: "right" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Servizio momentaneamente non disponibile. Riprova.",
      },
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const updateUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { updateUser: updateUserMock },
  }),
}));

const { modificaPassword } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

describe("modificaPassword", () => {
  beforeEach(() => {
    updateUserMock.mockReset();
  });

  it("returns a validation error when the new password is too short, no Supabase call", async () => {
    const result = await modificaPassword(
      undefined,
      buildFormData({ nuovaPassword: "corta1", confermaPassword: "corta1" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the new password is only whitespace, no Supabase call", async () => {
    const result = await modificaPassword(
      undefined,
      buildFormData({ nuovaPassword: "        ", confermaPassword: "        " })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La nuova password deve avere almeno 8 caratteri (non solo spazi).",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the new password exceeds 72 characters, no Supabase call", async () => {
    const lunga = "a".repeat(73);
    const result = await modificaPassword(
      undefined,
      buildFormData({ nuovaPassword: lunga, confermaPassword: lunga })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La nuova password non può superare i 72 caratteri.",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the confirmation does not match, no Supabase call", async () => {
    const result = await modificaPassword(
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password2" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La conferma non coincide con la nuova password.",
      },
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns successo:true and calls updateUser on success", async () => {
    updateUserMock.mockResolvedValue({ error: null });

    const result = await modificaPassword(
      undefined,
      buildFormData({ nuovaPassword: "password1", confermaPassword: "password1" })
    );

    expect(result).toEqual({ successo: true });
    expect(updateUserMock).toHaveBeenCalledWith({ password: "password1" });
  });

  it("returns an AUTH_ERROR, form still usable, when Supabase updateUser fails (e.g. expired session)", async () => {
    updateUserMock.mockResolvedValue({ error: { message: "session expired" } });

    const result = await modificaPassword(
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

  it("returns a friendly AUTH_ERROR, no crash, when updateUser throws unexpectedly", async () => {
    updateUserMock.mockRejectedValue(new Error("network down"));

    const result = await modificaPassword(
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
});

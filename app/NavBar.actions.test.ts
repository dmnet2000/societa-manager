import { describe, expect, it, vi, beforeEach } from "vitest";

const signOutMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signOut: signOutMock },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { esci } = await import("./NavBar.actions");

describe("esci (Server Action, Story 9.1)", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    redirectMock.mockClear();
  });

  it("termina la sessione Supabase e rediretta a /accedi", async () => {
    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(signOutMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/accedi");
  });

  it("rediretta comunque a /accedi (fail-closed) quando signOut() risolve con un errore", async () => {
    signOutMock.mockResolvedValue({ error: new Error("Supabase Auth non raggiungibile") });

    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/accedi");
  });

  it("rediretta comunque a /accedi (fail-closed) quando signOut() lancia un'eccezione", async () => {
    signOutMock.mockRejectedValue(new Error("network error"));

    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/accedi");
  });
});

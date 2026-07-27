import { describe, expect, it, vi, beforeEach } from "vitest";

const signOutMock = vi.fn();
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signOut: signOutMock },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { esci } = await import("./NavBar.actions");

describe("esci (Server Action, Story 9.1)", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    redirectMock.mockClear();
    revalidatePathMock.mockClear();
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

  // Story 9.7: senza invalidare il layout radice (dove NavBar e' montata), la
  // Client Cache del router Next.js riusa l'ultimo render della barra di
  // navigazione invece di ri-eseguire NavBar() sulla navigazione verso
  // /accedi innescata da questo redirect() - la barra restava visibile con
  // la sessione gia' terminata.
  it("invalida il layout radice (revalidatePath) prima di rediretare, cosi' la barra di navigazione sparisce (Story 9.7)", async () => {
    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("invalida comunque il layout radice (fail-closed) quando signOut() risolve con un errore (Story 9.7)", async () => {
    signOutMock.mockResolvedValue({ error: new Error("Supabase Auth non raggiungibile") });

    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("invalida comunque il layout radice (fail-closed) quando signOut() lancia un'eccezione (Story 9.7)", async () => {
    signOutMock.mockRejectedValue(new Error("network error"));

    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("chiama revalidatePath prima di redirect, non dopo (Story 9.7)", async () => {
    const ordine: string[] = [];
    revalidatePathMock.mockImplementation(() => {
      ordine.push("revalidatePath");
    });
    redirectMock.mockImplementation(() => {
      ordine.push("redirect");
      throw new Error("REDIRECT");
    });

    await expect(esci()).rejects.toThrow("REDIRECT");

    expect(ordine).toEqual(["revalidatePath", "redirect"]);
  });
});

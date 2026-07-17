import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

const { requireRuolo } = await import("./require-ruolo");

describe("requireRuolo", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("returns null when the authenticated user has the required ruolo", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ADMIN"] } } },
    });

    expect(await requireRuolo("ADMIN")).toBeNull();
  });

  it("returns a FORBIDDEN error when the user lacks the required ruolo", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ATLETA"] } } },
    });

    expect(await requireRuolo("ADMIN")).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("returns a FORBIDDEN error when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    expect(await requireRuolo("ADMIN")).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("returns null when the user has at least one of multiple allowed ruoli", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["DIRIGENTE"] } } },
    });

    expect(await requireRuolo(["ADMIN", "DIRIGENTE"])).toBeNull();
  });

  it("returns a FORBIDDEN error when the user has none of multiple allowed ruoli", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { app_metadata: { ruoli: ["ATLETA"] } } },
    });

    expect(await requireRuolo(["ADMIN", "DIRIGENTE"])).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
  });

  it("logs and stays fail-closed when getUser() itself returns an error (review fix)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "auth service down" },
    });

    const result = await requireRuolo("ADMIN");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

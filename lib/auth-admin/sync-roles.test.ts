import { describe, expect, it, vi, beforeEach } from "vitest";

const getUserByIdMock = vi.fn();
const updateUserByIdMock = vi.fn();

// "server-only" lancia un errore fuori dalla pipeline di build di Next.js
// (che normalmente lo sostituisce con un modulo vuoto lato server).
vi.mock("server-only", () => ({}));

vi.mock("./client", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        getUserById: getUserByIdMock,
        updateUserById: updateUserByIdMock,
      },
    },
  }),
}));

const { sincronizzaRuoliAppMetadata } = await import("./sync-roles");

describe("sincronizzaRuoliAppMetadata", () => {
  beforeEach(() => {
    getUserByIdMock.mockReset();
    updateUserByIdMock.mockReset();
  });

  it("merges the new ruoli into the existing app_metadata instead of replacing it", async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: { app_metadata: { altroCampo: "valore" } } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });

    await sincronizzaRuoliAppMetadata("u1", ["ADMIN"]);

    expect(updateUserByIdMock).toHaveBeenCalledWith("u1", {
      app_metadata: { altroCampo: "valore", ruoli: ["ADMIN"] },
    });
  });

  it("throws when reading the existing user fails", async () => {
    getUserByIdMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(sincronizzaRuoliAppMetadata("u1", ["ADMIN"])).rejects.toThrow(
      "Lettura utente u1 fallita"
    );
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("throws when the update fails", async () => {
    getUserByIdMock.mockResolvedValue({
      data: { user: { app_metadata: {} } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: { message: "boom" } });

    await expect(sincronizzaRuoliAppMetadata("u1", ["ADMIN"])).rejects.toThrow(
      "Sincronizzazione ruoli su app_metadata fallita"
    );
  });
});

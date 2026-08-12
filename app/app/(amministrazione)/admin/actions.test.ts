import { describe, expect, it, vi, beforeEach } from "vitest";

const createUserMock = vi.fn();
const updateUserByIdMock = vi.fn();
const utenteCreateMock = vi.fn();
const utenteUpdateMock = vi.fn();
const utenteCountMock = vi.fn();
const utenteFindUniqueOrThrowMock = vi.fn();
const transactionMock = vi.fn();
const sincronizzaRuoliMock = vi.fn();
const revalidatePathMock = vi.fn();
const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: createUserMock, updateUserById: updateUserByIdMock } },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    utente: {
      create: utenteCreateMock,
      update: utenteUpdateMock,
      count: utenteCountMock,
      findUniqueOrThrow: utenteFindUniqueOrThrowMock,
    },
    utenteRuolo: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/auth-admin/sync-roles", () => ({
  sincronizzaRuoliAppMetadata: sincronizzaRuoliMock,
}));

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaUtente, impostaAttivoUtente, aggiornaRuoliUtente, reimpostaPasswordFissaUtente } =
  await import("./actions");

function buildFormData(fields: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
    } else {
      formData.append(key, value);
    }
  }
  return formData;
}

describe("autorizzazione (comune alle 3 Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    createUserMock.mockReset();
    utenteUpdateMock.mockReset();
    transactionMock.mockReset();
  });

  it("creaUtente restituisce FORBIDDEN e non chiama Supabase se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaUtente(
      undefined,
      buildFormData({ email: "a@example.com", password: "pw123456", ruoli: ["ATLETA"] })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("impostaAttivoUtente restituisce FORBIDDEN e non tocca Prisma se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaAttivoUtente(undefined, "u1", false);

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("aggiornaRuoliUtente restituisce FORBIDDEN e non tocca Prisma se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({ utenteId: "u1", ruoli: ["ATLETA"] })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("reimpostaPasswordFissaUtente restituisce FORBIDDEN e non chiama Supabase se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await reimpostaPasswordFissaUtente(undefined, "u1");

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});

describe("reimpostaPasswordFissaUtente", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    utenteFindUniqueOrThrowMock.mockReset();
    updateUserByIdMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });
  });

  it("deriva il supabaseAuthId da utenteId via Prisma e imposta la password fissa concordata su un bersaglio non-Admin", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    updateUserByIdMock.mockResolvedValue({ error: null });

    const result = await reimpostaPasswordFissaUtente(undefined, "u1");

    expect(utenteFindUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      include: { ruoli: true },
    });
    expect(updateUserByIdMock).toHaveBeenCalledWith("auth-u1", {
      password: "Volley@Mogliano",
    });
    expect(result).toBeUndefined();
  });

  it("refuses to reset the password of a target Utente who is also Admin (account-takeover prevention)", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      supabaseAuthId: "auth-admin2",
      ruoli: [{ ruolo: "ADMIN" }],
    });

    const result = await reimpostaPasswordFissaUtente(undefined, "u-admin2");

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi reimpostare la password di un altro Admin con questa funzione.",
      },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("refuses the reset even when the target has Admin among multiple Ruoli", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      supabaseAuthId: "auth-u2",
      ruoli: [{ ruolo: "ALLENATORE" }, { ruolo: "ADMIN" }],
    });

    const result = await reimpostaPasswordFissaUtente(undefined, "u2");

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi reimpostare la password di un altro Admin con questa funzione.",
      },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns an error, no crash, when updateUserById fails", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    updateUserByIdMock.mockResolvedValue({ error: { message: "unexpected" } });

    const result = await reimpostaPasswordFissaUtente(undefined, "u1");

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile reimpostare la password. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when Prisma throws (Utente inesistente)", async () => {
    utenteFindUniqueOrThrowMock.mockRejectedValue(new Error("not found"));

    const result = await reimpostaPasswordFissaUtente(undefined, "u1");

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile reimpostare la password. Riprova." },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});

describe("creaUtente", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createUserMock.mockReset();
    utenteCreateMock.mockReset();
    sincronizzaRuoliMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns an error when no ruolo is selected", async () => {
    const result = await creaUtente(
      undefined,
      buildFormData({ email: "a@example.com", password: "pw123456" })
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." },
    });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when createUser returns email_exists", async () => {
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "already registered" },
    });

    const result = await creaUtente(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when createUser returns user_already_exists (defensive dual-check)", async () => {
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { code: "user_already_exists", message: "already registered" },
    });

    const result = await creaUtente(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
  });

  it("returns a friendly error when createUser throws unexpectedly, no crash", async () => {
    createUserMock.mockRejectedValue(new Error("network down"));

    const result = await creaUtente(
      undefined,
      buildFormData({
        email: "a@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    });
  });

  it("creates the Utente + Ruoli, syncs app_metadata, and reports success (AC #1)", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "u1", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({});
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await creaUtente(
      undefined,
      buildFormData({
        email: "nuovo@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE", "ALLENATORE"],
      })
    );

    expect(result).toEqual({ success: true });
    expect(createUserMock).toHaveBeenCalledWith({
      email: "nuovo@example.com",
      password: "pw123456",
      email_confirm: true,
    });
    expect(utenteCreateMock).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: "u1",
        email: "nuovo@example.com",
        ruoli: { create: [{ ruolo: "ALLENATORE" }] },
      },
    });
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("u1", ["ALLENATORE"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });

  it("returns a friendly error, no crash, when the post-creation sync fails", async () => {
    createUserMock.mockResolvedValue({
      data: { user: { id: "u2", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({});
    sincronizzaRuoliMock.mockRejectedValue(new Error("sync failed"));

    const result = await creaUtente(
      undefined,
      buildFormData({
        email: "orfano@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare l'utente. Riprova." },
    });
  });
});

describe("impostaAttivoUtente", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    utenteUpdateMock.mockReset();
    utenteCountMock.mockReset();
    utenteFindUniqueOrThrowMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("toggles attivo to false (disattiva) when other active Admins remain", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    utenteUpdateMock.mockResolvedValue({});

    const result = await impostaAttivoUtente(undefined, "u1", false);

    expect(result).toBeUndefined();
    expect(utenteUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { attivo: false },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });

  it("toggles attivo to true (riattiva) without checking for other Admins", async () => {
    utenteUpdateMock.mockResolvedValue({});

    await impostaAttivoUtente(undefined, "u1", true);

    expect(utenteFindUniqueOrThrowMock).not.toHaveBeenCalled();
    expect(utenteUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { attivo: true },
    });
  });

  it("refuses to deactivate the last active Admin", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      ruoli: [{ ruolo: "ADMIN" }],
    });
    utenteCountMock.mockResolvedValue(0);

    const result = await impostaAttivoUtente(undefined, "u1", false);

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi disattivare l'unico Admin attivo rimasto.",
      },
    });
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("allows deactivating an Admin when another active Admin exists", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      ruoli: [{ ruolo: "ADMIN" }],
    });
    utenteCountMock.mockResolvedValue(1);
    utenteUpdateMock.mockResolvedValue({});

    const result = await impostaAttivoUtente(undefined, "u1", false);

    expect(result).toBeUndefined();
    expect(utenteUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { attivo: false },
    });
  });

  it("returns a friendly error when the update fails, no crash", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    utenteUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await impostaAttivoUtente(undefined, "u1", false);

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare lo stato dell'utente. Riprova.",
      },
    });
  });
});

describe("aggiornaRuoliUtente", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    utenteFindUniqueOrThrowMock.mockReset();
    utenteCountMock.mockReset();
    transactionMock.mockReset();
    sincronizzaRuoliMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns an error when no ruolo is selected", async () => {
    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({ utenteId: "u1" })
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("derives supabaseAuthId from utenteId server-side, replaces the Ruoli set in a transaction, dedupes duplicates", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      supabaseAuthId: "sb1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    transactionMock.mockResolvedValue([{}, {}]);
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({
        utenteId: "u1",
        // supabaseAuthId intenzionalmente NON inviato dal client fidato:
        // deve essere derivato da Prisma, non da un campo del form.
        ruoli: ["DIRIGENTE", "DIRIGENTE", "ADMIN"],
      })
    );

    expect(result).toBeUndefined();
    expect(utenteFindUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      include: { ruoli: true },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("sb1", [
      "DIRIGENTE",
      "ADMIN",
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });

  it("refuses to remove the ADMIN ruolo from the last active Admin", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      supabaseAuthId: "sb1",
      ruoli: [{ ruolo: "ADMIN" }],
    });
    utenteCountMock.mockResolvedValue(0);

    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({ utenteId: "u1", ruoli: ["ATLETA"] })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi rimuovere il ruolo Admin all'unico Admin attivo rimasto.",
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("allows removing ADMIN when another active Admin exists", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      supabaseAuthId: "sb1",
      ruoli: [{ ruolo: "ADMIN" }],
    });
    utenteCountMock.mockResolvedValue(1);
    transactionMock.mockResolvedValue([{}, {}]);
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({ utenteId: "u1", ruoli: ["ATLETA"] })
    );

    expect(result).toBeUndefined();
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      supabaseAuthId: "sb1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    transactionMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaRuoliUtente(
      undefined,
      buildFormData({ utenteId: "u1", ruoli: ["ATLETA"] })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare i Ruoli. Riprova." },
    });
  });
});

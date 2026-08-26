import { describe, expect, it, vi, beforeEach } from "vitest";

const createUserMock = vi.fn();
const updateUserByIdMock = vi.fn();
const getUserByIdMock = vi.fn();
const generateLinkMock = vi.fn();
const utenteCreateMock = vi.fn();
const utenteUpdateMock = vi.fn();
const utenteCountMock = vi.fn();
const utenteFindUniqueOrThrowMock = vi.fn();
const transactionMock = vi.fn();
const sincronizzaRuoliMock = vi.fn();
const revalidatePathMock = vi.fn();
const requireRuoloMock = vi.fn();
const getUserMock = vi.fn();
const headersMock = vi.fn();
const inviaEmailMock = vi.fn();

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        createUser: createUserMock,
        updateUserById: updateUserByIdMock,
        getUserById: getUserByIdMock,
        generateLink: generateLinkMock,
      },
    },
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

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/email/invia-email", () => ({
  inviaEmail: inviaEmailMock,
}));

const {
  creaUtente,
  impostaAttivoUtente,
  aggiornaRuoliUtente,
  reimpostaPasswordFissaUtente,
  correggiEmailUtenteAction,
} = await import("./actions");

function buildHeaders(entries: Record<string, string>) {
  return new Map(Object.entries(entries));
}

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

  it("correggiEmailUtenteAction restituisce FORBIDDEN e non chiama Supabase se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

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

describe("correggiEmailUtenteAction", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    utenteFindUniqueOrThrowMock.mockReset();
    updateUserByIdMock.mockReset();
    getUserByIdMock.mockReset();
    generateLinkMock.mockReset();
    utenteUpdateMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      buildHeaders({ host: "app.esempio.it", "x-forwarded-proto": "https" })
    );
    inviaEmailMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns VALIDATION and touches nothing when nuovaEmail is empty", async () => {
    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Inserisci un indirizzo email valido." },
    });
    expect(utenteFindUniqueOrThrowMock).not.toHaveBeenCalled();
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION and touches nothing when nuovaEmail has no '@'", async () => {
    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "nonvalida" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Inserisci un indirizzo email valido." },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it.each(["a@", "@b.it", "a@@b.it", "a@b", "a b@esempio.it"])(
    "returns VALIDATION for a grossly malformed email: %s (review fix - a bare '@' check was too weak)",
    async (nuovaEmailNonValida) => {
      const result = await correggiEmailUtenteAction(
        undefined,
        buildFormData({ utenteId: "u1", nuovaEmail: nuovaEmailNonValida })
      );

      expect(result).toEqual({
        error: { code: "VALIDATION", message: "Inserisci un indirizzo email valido." },
      });
      expect(updateUserByIdMock).not.toHaveBeenCalled();
    }
  );

  it("returns a friendly error, no crash, when the Utente does not exist", async () => {
    utenteFindUniqueOrThrowMock.mockRejectedValue(new Error("not found"));

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("refuses a target Utente who is Admin (account-takeover prevention), no Supabase call", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-admin1",
      ruoli: [{ ruolo: "ADMIN" }],
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Non puoi correggere l'email di un altro Admin con questa funzione.",
      },
    });
    expect(getUserByIdMock).not.toHaveBeenCalled();
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when getUserById fails", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({ data: { user: null }, error: { message: "boom" } });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("refuses a target Utente who has already confirmed the account, no writes", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: "2026-01-01T00:00:00Z" } },
      error: null,
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Questo Utente ha già confermato l'account: questa funzione corregge solo un'email mai confermata.",
      },
    });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses when the new email is already in use by another Utente (updateUserById returns email_exists), no Prisma write", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({
      error: { code: "email_exists", message: "email already in use" },
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "gia-in-uso@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Impossibile correggere l'email: verifica che non sia già in uso da un altro Utente.",
      },
    });
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses when updateUserById returns user_already_exists (defensive dual-check, mirror creaUtente)", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({
      error: { code: "user_already_exists", message: "email already in use" },
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "gia-in-uso@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Impossibile correggere l'email: verifica che non sia già in uso da un altro Utente.",
      },
    });
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a generic INTERNAL error (not the duplicate-email message) when updateUserById fails for an unrelated reason", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({
      error: { code: "over_request_rate_limit", message: "rate limited" },
    });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile correggere l'email. Riprova." },
    });
    expect(utenteUpdateMock).not.toHaveBeenCalled();
  });

  it("corrects the email on Supabase + Prisma, regenerates and resends the confirmation link (happy path)", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    utenteUpdateMock.mockResolvedValue({});
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "tok123" } },
      error: null,
    });
    inviaEmailMock.mockResolvedValue(undefined);

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({ success: true });
    expect(updateUserByIdMock).toHaveBeenCalledWith("auth-u1", {
      email: "corretta@example.com",
    });
    expect(utenteUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { email: "corretta@example.com" },
    });
    expect(generateLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "signup", email: "corretta@example.com" })
    );
    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatario: "corretta@example.com",
        testo: expect.stringContaining(
          "https://app.esempio.it/conferma-registrazione?token_hash=tok123"
        ),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });

  it("normalizes nuovaEmail to lowercase before using it anywhere (Supabase, Prisma, link, invio)", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    utenteUpdateMock.mockResolvedValue({});
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "tok123" } },
      error: null,
    });
    inviaEmailMock.mockResolvedValue(undefined);

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "  Corretta@Example.COM  " })
    );

    expect(result).toEqual({ success: true });
    expect(updateUserByIdMock).toHaveBeenCalledWith("auth-u1", {
      email: "corretta@example.com",
    });
    expect(utenteUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { email: "corretta@example.com" },
    });
    expect(generateLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "corretta@example.com" })
    );
    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ destinatario: "corretta@example.com" })
    );
  });

  it("returns INTERNAL, no crash, when prisma.utente.update rejects after Supabase was already updated - no generateLink/inviaEmail", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    utenteUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message:
          "Email corretta su Supabase ma non nel database: contatta l'assistenza tecnica.",
      },
    });
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("returns EMAIL_NON_INVIATA when generateLink fails - email already corrected, no rollback", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    utenteUpdateMock.mockResolvedValue({});
    generateLinkMock.mockResolvedValue({ data: {}, error: { message: "boom" } });

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Email corretta ma impossibile generare il nuovo link di conferma. Ripeti la correzione con la stessa email per riprovare.",
      },
    });
    // L'email e' gia' stata corretta su Supabase+Prisma - nessun rollback.
    expect(utenteUpdateMock).toHaveBeenCalledTimes(1);
    expect(inviaEmailMock).not.toHaveBeenCalled();
    // Review fix: revalidatePath comunque, la pagina Admin deve riflettere
    // subito la nuova email anche quando il resto del flusso fallisce.
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });

  it("returns EMAIL_NON_INVIATA when inviaEmail throws (SMTP unreachable) - email already corrected, no rollback", async () => {
    utenteFindUniqueOrThrowMock.mockResolvedValue({
      id: "u1",
      email: "vecchia@example.com",
      supabaseAuthId: "auth-u1",
      ruoli: [{ ruolo: "ATLETA" }],
    });
    getUserByIdMock.mockResolvedValue({
      data: { user: { email_confirmed_at: null } },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    utenteUpdateMock.mockResolvedValue({});
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "tok123" } },
      error: null,
    });
    inviaEmailMock.mockRejectedValue(new Error("CONFIGURAZIONE_SMTP_MANCANTE"));

    const result = await correggiEmailUtenteAction(
      undefined,
      buildFormData({ utenteId: "u1", nuovaEmail: "corretta@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Email corretta ma impossibile inviare il nuovo link di conferma. Ripeti la correzione con la stessa email per riprovare.",
      },
    });
    expect(utenteUpdateMock).toHaveBeenCalledTimes(1);
    // Review fix: stesso motivo del test precedente (ramo generateLink).
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/admin");
  });
});

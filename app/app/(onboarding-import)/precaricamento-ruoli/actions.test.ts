import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const trovaPrecaricamentoRuoloMock = vi.fn();
const createManyMock = vi.fn();
const findManyMock = vi.fn();
const deleteManyMock = vi.fn();
const transactionMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/matching-email-ruolo", async () => {
  const { normalizzaEmailRuolo } = await vi.importActual<
    typeof import("@/lib/matching-email-ruolo/normalizza-email-ruolo")
  >("@/lib/matching-email-ruolo/normalizza-email-ruolo");
  const { RUOLI_BLOCCATI_SENZA_PRECARICAMENTO } = await vi.importActual<
    typeof import("@/lib/matching-email-ruolo/ruoli-bloccati-senza-precaricamento")
  >("@/lib/matching-email-ruolo/ruoli-bloccati-senza-precaricamento");
  return {
    trovaPrecaricamentoRuolo: trovaPrecaricamentoRuoloMock,
    normalizzaEmailRuolo,
    RUOLI_BLOCCATI_SENZA_PRECARICAMENTO,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    precaricamentoRuolo: {
      createMany: createManyMock,
      findMany: findManyMock,
      deleteMany: deleteManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { precaricaRuolo, aggiornaPrecaricamentoRuolo, cancellaPrecaricamentoRuolo } = await import(
  "./actions"
);

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

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  trovaPrecaricamentoRuoloMock.mockReset();
  createManyMock.mockReset();
  findManyMock.mockReset();
  deleteManyMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  revalidatePathMock.mockReset();
});

describe("precaricaRuolo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(createManyMock).not.toHaveBeenCalled();
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"]);
  });

  it("returns a validation error when the email is missing", async () => {
    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'email è obbligatoria." },
    });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when no ruolo is selected", async () => {
    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Seleziona almeno un Ruolo (Segreteria e/o Dirigente).",
      },
    });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("creates one row per selected Ruolo, normalizing the email", async () => {
    trovaPrecaricamentoRuoloMock.mockResolvedValue(null);
    createManyMock.mockResolvedValue({ count: 2 });

    const result = await precaricaRuolo(
      undefined,
      buildFormData({
        email: "  Mario@Example.COM  ",
        ruoli: ["SEGRETERIA", "DIRIGENTE"],
      })
    );

    expect(result).toEqual({ success: true });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        { email: "mario@example.com", ruolo: "SEGRETERIA", utenteId: null },
        { email: "mario@example.com", ruolo: "DIRIGENTE", utenteId: null },
      ],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-ruoli");
  });

  it("dedupes duplicate ruolo values before creating", async () => {
    trovaPrecaricamentoRuoloMock.mockResolvedValue(null);
    createManyMock.mockResolvedValue({ count: 1 });

    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com", ruoli: ["SEGRETERIA", "SEGRETERIA"] })
    );

    expect(result).toEqual({ success: true });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null }],
    });
  });

  it("ignores ruolo values outside Segreteria/Dirigente", async () => {
    trovaPrecaricamentoRuoloMock.mockResolvedValue(null);
    createManyMock.mockResolvedValue({ count: 1 });

    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com", ruoli: ["SEGRETERIA", "ADMIN"] })
    );

    expect(result).toEqual({ success: true });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null }],
    });
  });

  it("rejects when the email is already preloaded for one of the selected Ruoli", async () => {
    trovaPrecaricamentoRuoloMock.mockImplementation(async (_email: string, ruolo: string) =>
      ruolo === "SEGRETERIA" ? { id: "p1", email: "a@example.com", ruolo, utenteId: null } : null
    );

    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com", ruoli: ["SEGRETERIA", "DIRIGENTE"] })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Questa email è già precaricata per almeno uno dei Ruoli selezionati.",
      },
    });
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    trovaPrecaricamentoRuoloMock.mockResolvedValue(null);
    createManyMock.mockRejectedValue(new Error("db down"));

    const result = await precaricaRuolo(
      undefined,
      buildFormData({ email: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile precaricare l'email. Riprova." },
    });
  });
});

describe("aggiornaPrecaricamentoRuolo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when no ruolo is selected", async () => {
    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "a@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Seleziona almeno un Ruolo (Segreteria e/o Dirigente).",
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects when at least one row of the voce is already linked to an account", async () => {
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: "u1" },
      { email: "a@example.com", ruolo: "DIRIGENTE", utenteId: null },
    ]);

    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile modificare: questa voce è già agganciata a un account registrato.",
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  // Review fix (Edge Case Hunter): senza questo controllo, un
  // emailOriginale senza righe esistenti (typo, voce gia' cancellata)
  // faceva silenziosamente da "createMany" invece di rifiutare (deleteMany
  // su un where senza corrispondenze e' un no-op, createMany procedeva).
  it("rejects with 'Voce non trovata' when emailOriginale matches no existing row", async () => {
    findManyMock.mockResolvedValue([]);

    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "inesistente@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Voce non trovata." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("replaces the rows for the given email (delete then create) when no row is linked", async () => {
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null },
      { email: "a@example.com", ruolo: "DIRIGENTE", utenteId: null },
    ]);
    deleteManyMock.mockReturnValue("delete-op");
    createManyMock.mockReturnValue("create-op");

    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({ success: true });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { email: "a@example.com" } });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null }],
    });
    expect(transactionMock).toHaveBeenCalledWith(["delete-op", "create-op"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-ruoli");
  });

  it("returns a friendly error, no crash, when the transaction fails", async () => {
    // Review fix (Edge Case Hunter, Story 9.41): righe esistenti non vuote -
    // altrimenti il nuovo controllo "Voce non trovata" intercetterebbe
    // prima di raggiungere la transazione, invalidando questo test.
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null },
    ]);
    transactionMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaPrecaricamentoRuolo(
      undefined,
      buildFormData({ emailOriginale: "a@example.com", ruoli: ["SEGRETERIA"] })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare i Ruoli. Riprova." },
    });
  });
});

describe("cancellaPrecaricamentoRuolo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaPrecaricamentoRuolo(
      undefined,
      buildFormData({ email: "a@example.com" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes every row for an email with no row linked to an account", async () => {
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null },
    ]);
    deleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaPrecaricamentoRuolo(
      undefined,
      buildFormData({ email: "a@example.com" })
    );

    expect(result).toEqual({ success: true });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { email: "a@example.com" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-ruoli");
  });

  it("blocks deletion when at least one row is already linked to an account", async () => {
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: "u1" },
      { email: "a@example.com", ruolo: "DIRIGENTE", utenteId: null },
    ]);

    const result = await cancellaPrecaricamentoRuolo(
      undefined,
      buildFormData({ email: "a@example.com" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Impossibile cancellare: questa voce è già agganciata a un account registrato.",
      },
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the voce does not exist", async () => {
    findManyMock.mockResolvedValue([]);

    const result = await cancellaPrecaricamentoRuolo(
      undefined,
      buildFormData({ email: "non-esiste@example.com" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the delete fails", async () => {
    findManyMock.mockResolvedValue([
      { email: "a@example.com", ruolo: "SEGRETERIA", utenteId: null },
    ]);
    deleteManyMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaPrecaricamentoRuolo(
      undefined,
      buildFormData({ email: "a@example.com" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare. Riprova." },
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const trovaAllenatorePerCodiceFiscaleMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteManyMock = vi.fn();
const findUniqueMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/matching-codice-fiscale", async () => {
  const { isCodiceFiscaleValido } = await vi.importActual<
    typeof import("@/lib/matching-codice-fiscale/valida-codice-fiscale")
  >("@/lib/matching-codice-fiscale/valida-codice-fiscale");
  return {
    trovaAllenatorePerCodiceFiscale: trovaAllenatorePerCodiceFiscaleMock,
    isCodiceFiscaleValido,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    allenatore: {
      create: createMock,
      update: updateMock,
      deleteMany: deleteManyMock,
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { precaricaAllenatore, aggiornaAllenatore, cancellaAllenatore } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

// Livello di modulo (non annidato in un solo describe): si applica a tutti i
// blocchi describe di questo file (precaricaAllenatore, aggiornaAllenatore,
// cancellaAllenatore) - i mock sono condivisi tra tutte le describe, un
// beforeEach annidato in una sola non resetterebbe le altre.
beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  trovaAllenatorePerCodiceFiscaleMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteManyMock.mockReset();
  findUniqueMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("precaricaAllenatore", () => {

  it("returns FORBIDDEN and does nothing if the caller is not Admin (Story 9.22: Dirigente rimosso)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome, cognome or codiceFiscale is missing", async () => {
    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "", cognome: "", codiceFiscale: "" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Nome, Cognome e Codice Fiscale sono obbligatori.",
      },
    });
  });

  it("returns a validation error when cognome is missing but nome and codiceFiscale are present", async () => {
    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario", cognome: "", codiceFiscale: "RSSMRA10A41H501Z" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Nome, Cognome e Codice Fiscale sono obbligatori.",
      },
    });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Codice Fiscale has an invalid format", async () => {
    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario", cognome: "Rossi", codiceFiscale: "123" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).",
      },
    });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns an error when the Codice Fiscale is already preloaded or registered (AC #2)", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "a1",
      codiceFiscale: "RSSMRA10A41H501Z",
      utenteId: null,
    });

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario", cognome: "Rossi", codiceFiscale: "rssmra10a41h501z" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale già precaricato o già associato a un account.",
      },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a minimal Allenatore record with utenteId null (AC #1, #3)", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    createMock.mockResolvedValue({});

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "  rssmra10a41h501z  ",
      })
    );

    expect(result).toEqual({ success: true });
    // Review fix (Story 9.22): senza questa asserzione, la restrizione a
    // solo ADMIN (rimozione di DIRIGENTE) non era verificata da alcun test
    // a livello di Server Action - stesso pattern gia' usato altrove nel
    // progetto per verificare i Ruoli richiesti (import-atlete/actions.test.ts).
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"], "/app/precaricamento-allenatori");
    expect(createMock).toHaveBeenCalledWith({
      data: {
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
        utenteId: null,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-allenatori");
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error("db down"));

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario", cognome: "Rossi", codiceFiscale: "RSSMRA10A41H501Z" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile precaricare l'Allenatore. Riprova.",
      },
    });
  });
});

describe("aggiornaAllenatore", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin (Story 9.22: Dirigente rimosso)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({
        id: "a1",
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome, cognome or codiceFiscale is missing", async () => {
    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({ id: "a1", nome: "", cognome: "", codiceFiscale: "" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Nome, Cognome e Codice Fiscale sono obbligatori.",
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Codice Fiscale has an invalid format", async () => {
    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({ id: "a1", nome: "Mario", cognome: "Rossi", codiceFiscale: "123" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).",
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Codice Fiscale is already used by another Allenatore", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "a2",
      codiceFiscale: "RSSMRA10A41H501Z",
    });

    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({
        id: "a1",
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale già precaricato o già associato a un account.",
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows keeping the Codice Fiscale unchanged on the same Allenatore", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "a1",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    updateMock.mockResolvedValue({});

    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({
        id: "a1",
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { nome: "Mario", cognome: "Rossi", codiceFiscale: "RSSMRA10A41H501Z" },
    });
  });

  it("updates nome, cognome and codiceFiscale for the given id", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({});

    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({
        id: "a1",
        nome: "Nuovo Nome",
        cognome: "Nuovo Cognome",
        codiceFiscale: "  rssmra10a41h501z  ",
      })
    );

    expect(result).toEqual({ success: true });
    // Review fix (Story 9.22): vedi commento gemello in precaricaAllenatore.
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"], "/app/precaricamento-allenatori");
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: {
        nome: "Nuovo Nome",
        cognome: "Nuovo Cognome",
        codiceFiscale: "RSSMRA10A41H501Z",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-allenatori");
  });

  it("returns a friendly error, no crash, when the update fails", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    updateMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaAllenatore(
      undefined,
      buildFormData({
        id: "a1",
        nome: "Mario",
        cognome: "Rossi",
        codiceFiscale: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare l'Allenatore. Riprova.",
      },
    });
  });
});

describe("cancellaAllenatore", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin (Story 9.22: Dirigente rimosso)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes an Allenatore not linked to any account and not assigned to any Gruppo (AC #3)", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({ success: true });
    // Review fix (Story 9.22): vedi commento gemello in precaricaAllenatore.
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN"], "/app/precaricamento-allenatori");
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "a1", utenteId: null, gruppi: { none: {} } },
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/precaricamento-allenatori");
  });

  it("blocks deletion when the Allenatore is already linked to an account (AC #4)", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue({ id: "a1", utenteId: "u1", gruppi: [] });

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: expect.stringContaining("account"),
      },
    });
  });

  it("blocks deletion when the Allenatore is assigned to at least one Gruppo (AC #4)", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue({
      id: "a1",
      utenteId: null,
      gruppi: [{ id: "ga1" }],
    });

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: expect.stringContaining("Gruppo"),
      },
    });
  });

  it("aggregates both reasons when the Allenatore is linked AND assigned to a Gruppo", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue({
      id: "a1",
      utenteId: "u1",
      gruppi: [{ id: "ga1" }],
    });

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Impossibile cancellare: l'Allenatore è già agganciato a un account e è assegnato ad almeno un Gruppo.",
      },
    });
  });

  it("returns a friendly error, no crash, when the Allenatore does not exist", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue(null);

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "non-esiste" }));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Allenatore. Riprova." },
    });
  });

  it("returns a friendly error, no crash, when the delete fails", async () => {
    deleteManyMock.mockRejectedValue(new Error("db down"));

    const result = await cancellaAllenatore(undefined, buildFormData({ id: "a1" }));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Allenatore. Riprova." },
    });
  });
});

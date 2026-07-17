import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const trovaAllenatorePerCodiceFiscaleMock = vi.fn();
const createMock = vi.fn();
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
  prisma: { allenatore: { create: createMock } },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { precaricaAllenatore } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

describe("precaricaAllenatore", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    trovaAllenatorePerCodiceFiscaleMock.mockReset();
    createMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario Rossi", codiceFiscale: "RSSMRA10A41H501Z" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome or codiceFiscale is missing", async () => {
    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "", codiceFiscale: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nome e Codice Fiscale sono obbligatori." },
    });
  });

  it("returns a validation error when the Codice Fiscale has an invalid format", async () => {
    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario Rossi", codiceFiscale: "123" })
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
      buildFormData({ nome: "Mario Rossi", codiceFiscale: "rssmra10a41h501z" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale già precaricato o già associato a un account.",
      },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a minimal Allenatore record with utenteId null (AC #1)", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    createMock.mockResolvedValue({});

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario Rossi", codiceFiscale: "  rssmra10a41h501z  " })
    );

    expect(result).toEqual({ success: true });
    expect(createMock).toHaveBeenCalledWith({
      data: { nome: "Mario Rossi", codiceFiscale: "RSSMRA10A41H501Z", utenteId: null },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/precaricamento-allenatori");
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);
    createMock.mockRejectedValue(new Error("db down"));

    const result = await precaricaAllenatore(
      undefined,
      buildFormData({ nome: "Mario Rossi", codiceFiscale: "RSSMRA10A41H501Z" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile precaricare l'Allenatore. Riprova.",
      },
    });
  });
});

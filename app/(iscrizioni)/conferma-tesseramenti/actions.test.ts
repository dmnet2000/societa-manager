import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const tesseramentoUpsertMock = vi.fn();
const transactionMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tesseramento: { upsert: tesseramentoUpsertMock },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { confermaTesseramenti } = await import("./actions");

function formDataConAtleti(...atletaIds: string[]): FormData {
  const formData = new FormData();
  atletaIds.forEach((id) => formData.append("atletaId", id));
  return formData;
}

describe("confermaTesseramenti (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    tesseramentoUpsertMock.mockReset();
    tesseramentoUpsertMock.mockImplementation((args) => args);
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operazioni) => operazioni);
    revalidatePathMock.mockReset();
  });

  it("restituisce FORBIDDEN e non scrive nulla se il chiamante non e' Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await confermaTesseramenti(
      undefined,
      formDataConAtleti("atleta-1")
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rifiuta con VALIDATION se nessuna Atleta e' selezionata, nessuna chiamata al DB (Review fix: la validazione precede ogni accesso ad anno/Prisma)", async () => {
    const result = await confermaTesseramenti(undefined, new FormData());

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona almeno un'Atleta." },
    });
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("conferma in blocco tutte le Atlete selezionate, indipendentemente dallo stato Iscrizione (estensione 2026-08-06)", async () => {
    const result = await confermaTesseramenti(
      undefined,
      formDataConAtleti("atleta-1", "atleta-2")
    );

    expect(result).toEqual({ success: true });
    expect(tesseramentoUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_annoAgonisticoId: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      },
      create: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      update: {},
    });
    expect(tesseramentoUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_annoAgonisticoId: { atletaId: "atleta-2", annoAgonisticoId: "anno-1" },
      },
      create: { atletaId: "atleta-2", annoAgonisticoId: "anno-1" },
      update: {},
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/conferma-tesseramenti");
  });

  it("deduplica gli atletaId ripetuti (form manomesso) prima di scrivere", async () => {
    await confermaTesseramenti(
      undefined,
      formDataConAtleti("atleta-1", "atleta-1")
    );

    expect(tesseramentoUpsertMock).toHaveBeenCalledTimes(1);
  });

  it("e' idempotente: confermare di nuovo la stessa Atleta non causa errori (AC #4 originale, invariato)", async () => {
    await confermaTesseramenti(undefined, formDataConAtleti("atleta-1"));
    const result = await confermaTesseramenti(
      undefined,
      formDataConAtleti("atleta-1")
    );

    expect(result).toEqual({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(2);
  });

  it("restituisce un errore, nessun crash, se la transazione fallisce (nessuna scrittura parziale, nessuna revalidazione della pagina)", async () => {
    transactionMock.mockRejectedValue(new Error("db down"));

    const result = await confermaTesseramenti(
      undefined,
      formDataConAtleti("atleta-1", "atleta-2")
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare i Tesseramenti selezionati. Riprova.",
      },
    });
    // Review fix: una revalidatePath dopo una transazione fallita
    // mostrerebbe alla pagina uno stato che non riflette alcuna scrittura
    // reale avvenuta.
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

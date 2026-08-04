import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const trovaIscrizioneAttivaMock = vi.fn();
const tesseramentoUpsertMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/db-rls/iscrizione", () => ({
  trovaIscrizioneAttiva: trovaIscrizioneAttivaMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tesseramento: {
      upsert: tesseramentoUpsertMock,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { confermaTesseramento } = await import("./actions");

describe("confermaTesseramento (Server Action)", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    requireRuoloMock.mockResolvedValue(null);
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ marker: "supabase-client" });
    risolviAnnoAgonisticoCorrenteMock.mockReset();
    risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
    trovaIscrizioneAttivaMock.mockReset();
    tesseramentoUpsertMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("restituisce FORBIDDEN e non tocca nulla se il chiamante non e' Admin/Dirigente (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(trovaIscrizioneAttivaMock).not.toHaveBeenCalled();
    expect(tesseramentoUpsertMock).not.toHaveBeenCalled();
  });

  it("conferma il Tesseramento se l'Iscrizione e' attiva (AC #2)", async () => {
    trovaIscrizioneAttivaMock.mockResolvedValue(true);
    tesseramentoUpsertMock.mockResolvedValue({});

    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({ success: true });
    expect(trovaIscrizioneAttivaMock).toHaveBeenCalledWith(
      { marker: "supabase-client" },
      "atleta-1",
      "anno-1"
    );
    expect(tesseramentoUpsertMock).toHaveBeenCalledWith({
      where: {
        atletaId_annoAgonisticoId: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      },
      create: { atletaId: "atleta-1", annoAgonisticoId: "anno-1" },
      update: {},
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/conferma-tesseramenti");
  });

  it("rifiuta con VALIDATION se l'Iscrizione non e' attiva, nessuna scrittura (AC #3)", async () => {
    trovaIscrizioneAttivaMock.mockResolvedValue(false);

    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'Iscrizione dell'Atleta deve essere confermata prima del Tesseramento.",
      },
    });
    expect(tesseramentoUpsertMock).not.toHaveBeenCalled();
  });

  it("e' idempotente: una seconda conferma sulla stessa Atleta+Anno chiama comunque upsert senza errore (AC #4)", async () => {
    trovaIscrizioneAttivaMock.mockResolvedValue(true);
    tesseramentoUpsertMock.mockResolvedValue({});

    await confermaTesseramento(undefined, "atleta-1");
    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({ success: true });
    expect(tesseramentoUpsertMock).toHaveBeenCalledTimes(2);
  });

  it("restituisce un errore, nessun crash, se la scrittura Prisma fallisce", async () => {
    trovaIscrizioneAttivaMock.mockResolvedValue(true);
    tesseramentoUpsertMock.mockRejectedValue(new Error("db down"));

    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile confermare il Tesseramento. Riprova." },
    });
  });

  it("restituisce un errore, nessun crash, se la verifica dell'Iscrizione fallisce", async () => {
    trovaIscrizioneAttivaMock.mockRejectedValue(new Error("rete down"));

    const result = await confermaTesseramento(undefined, "atleta-1");

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile confermare il Tesseramento. Riprova." },
    });
    expect(tesseramentoUpsertMock).not.toHaveBeenCalled();
  });
});

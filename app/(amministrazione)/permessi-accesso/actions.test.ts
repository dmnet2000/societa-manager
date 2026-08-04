import { describe, expect, it, vi, beforeEach } from "vitest";

const deleteManyMock = vi.fn();
const createManyMock = vi.fn();
const transactionMock = vi.fn();
const requireRuoloMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    permessoRotta: {
      deleteMany: deleteManyMock,
      createMany: createManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { salvaPermessiRotte } = await import("./actions");

function buildFormData(permessi: string[]) {
  const formData = new FormData();
  permessi.forEach((p) => formData.append("permessi", p));
  return formData;
}

describe("salvaPermessiRotte", () => {
  beforeEach(() => {
    requireRuoloMock.mockReset();
    deleteManyMock.mockReset();
    createManyMock.mockReset();
    transactionMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("restituisce FORBIDDEN e non tocca Prisma se il chiamante non e' Admin (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaPermessiRotte(
      undefined,
      buildFormData(["/palestre|DIRIGENTE"])
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("salva le righe abilitate in una transazione delete-all + insert (AC #4)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    const result = await salvaPermessiRotte(
      undefined,
      buildFormData(["/palestre|DIRIGENTE", "/mio-orario|ALLENATORE"])
    );

    expect(result).toEqual({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ rotta: "/palestre", ruolo: "DIRIGENTE", abilitato: true }),
        expect.objectContaining({ rotta: "/mio-orario", ruolo: "ALLENATORE", abilitato: true }),
      ],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/permessi-accesso");
  });

  it("nessuna casella spuntata produce zero righe (delete-all senza insert) - fail-closed su tutto (AC #4)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    const result = await salvaPermessiRotte(undefined, buildFormData([]));

    expect(result).toEqual({ success: true });
    expect(createManyMock).not.toHaveBeenCalled();
    expect(deleteManyMock).toHaveBeenCalledWith({});
    expect((transactionMock.mock.calls[0][0] as unknown[]).length).toBe(1);
  });

  it("deduplica chiavi ripetute prima dell'insert (doppio submit di rete)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    await salvaPermessiRotte(
      undefined,
      buildFormData(["/palestre|DIRIGENTE", "/palestre|DIRIGENTE"])
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({ rotta: "/palestre", ruolo: "DIRIGENTE" })],
    });
  });

  it("scarta una chiave con Ruolo ADMIN anche se inviata da un form manomesso (AC #2, difesa in profondita')", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    await salvaPermessiRotte(undefined, buildFormData(["/admin|ADMIN"]));

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("scarta una chiave con una rotta inesistente/non protetta (difesa in profondita')", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    await salvaPermessiRotte(
      undefined,
      buildFormData(["/rotta-inventata|DIRIGENTE"])
    );

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("scarta una chiave su una rotta ADMIN-only (es. /admin) anche con un Ruolo non-ADMIN (review fix, AC #2 esteso)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    await salvaPermessiRotte(undefined, buildFormData(["/admin|DIRIGENTE"]));

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("deduplica sulla coppia rotta+ruolo dopo il parsing, non sulla stringa grezza (review fix)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    // "/palestre|DIRIGENTE|extra" parsa alla stessa coppia di
    // "/palestre|DIRIGENTE" (segmenti oltre il secondo ignorati) ma e' una
    // stringa grezza diversa - un dedup sulla sola stringa non la
    // catturerebbe.
    await salvaPermessiRotte(
      undefined,
      buildFormData(["/palestre|DIRIGENTE", "/palestre|DIRIGENTE|extra"])
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({ rotta: "/palestre", ruolo: "DIRIGENTE" })],
    });
  });

  it("scarta una chiave malformata (nessun separatore '|')", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    await salvaPermessiRotte(undefined, buildFormData(["senza-separatore"]));

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("restituisce un errore, nessun crash, se la transazione fallisce", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockRejectedValue(new Error("db down"));

    const result = await salvaPermessiRotte(
      undefined,
      buildFormData(["/palestre|DIRIGENTE"])
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare la configurazione. Riprova." },
    });
  });
});

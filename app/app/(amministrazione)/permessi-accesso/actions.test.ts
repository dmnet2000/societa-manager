import { describe, expect, it, vi, beforeEach } from "vitest";

const deleteManyMock = vi.fn();
const createManyMock = vi.fn();
const transactionMock = vi.fn();
const requireRuoloMock = vi.fn();
const revalidatePathMock = vi.fn();
// Review fix (Blind Hunter + Edge Case Hunter + Acceptance Auditor,
// indipendentemente): salvaPermessiRotte ora chiama invalidaCachePermessi()
// dopo un salvataggio riuscito - mockata qui perche' il modulo reale ha
// "import server-only" (mai mockato in questo file finora, non serviva
// prima di questa chiamata).
const invalidaCachePermessiMock = vi.fn();

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

vi.mock("@/lib/auth/permessi-configurabili", () => ({
  invalidaCachePermessi: invalidaCachePermessiMock,
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
    invalidaCachePermessiMock.mockReset();
  });

  it("restituisce FORBIDDEN e non tocca Prisma se il chiamante non e' Admin (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaPermessiRotte(
      undefined,
      buildFormData(["/app/palestre|DIRIGENTE"])
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
    expect(invalidaCachePermessiMock).not.toHaveBeenCalled();
  });

  it("salva le righe abilitate in una transazione delete-all + insert (AC #4)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    const result = await salvaPermessiRotte(
      undefined,
      buildFormData(["/app/palestre|DIRIGENTE", "/app/mio-orario|ALLENATORE"])
    );

    expect(result).toEqual({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ rotta: "/app/palestre", ruolo: "DIRIGENTE", abilitato: true }),
        expect.objectContaining({ rotta: "/app/mio-orario", ruolo: "ALLENATORE", abilitato: true }),
      ],
    });
    // Review fix (Story 12.4, trovato indipendentemente da tutti e tre i
    // layer di review): un salvataggio riuscito deve invalidare la cache di
    // lettura, altrimenti l'effetto resterebbe invisibile fino alla
    // scadenza naturale del TTL (fino a 90s) invece di quasi-immediato.
    expect(invalidaCachePermessiMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/permessi-accesso");
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
      buildFormData(["/app/palestre|DIRIGENTE", "/app/palestre|DIRIGENTE"])
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({ rotta: "/app/palestre", ruolo: "DIRIGENTE" })],
    });
  });

  it("scarta una chiave con Ruolo ADMIN anche se inviata da un form manomesso (AC #2, difesa in profondita')", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}]);

    await salvaPermessiRotte(undefined, buildFormData(["/app/admin|ADMIN"]));

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("accetta una chiave su una rotta migrata (permessiConfigurabili:true) anche se ruoliAmmessi storico resta ADMIN-only (Story 12.4)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    await salvaPermessiRotte(
      undefined,
      buildFormData(["/app/precaricamento-allenatori|DIRIGENTE"])
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          rotta: "/app/precaricamento-allenatori",
          ruolo: "DIRIGENTE",
        }),
      ],
    });
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

    await salvaPermessiRotte(undefined, buildFormData(["/app/admin|DIRIGENTE"]));

    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("deduplica sulla coppia rotta+ruolo dopo il parsing, non sulla stringa grezza (review fix)", async () => {
    requireRuoloMock.mockResolvedValue(null);
    transactionMock.mockResolvedValue([{}, {}]);

    // "/app/palestre|DIRIGENTE|extra" parsa alla stessa coppia di
    // "/app/palestre|DIRIGENTE" (segmenti oltre il secondo ignorati) ma e' una
    // stringa grezza diversa - un dedup sulla sola stringa non la
    // catturerebbe.
    await salvaPermessiRotte(
      undefined,
      buildFormData(["/app/palestre|DIRIGENTE", "/app/palestre|DIRIGENTE|extra"])
    );

    expect(createManyMock).toHaveBeenCalledWith({
      data: [expect.objectContaining({ rotta: "/app/palestre", ruolo: "DIRIGENTE" })],
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
      buildFormData(["/app/palestre|DIRIGENTE"])
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare la configurazione. Riprova." },
    });
    // Review fix (Story 12.4): la cache non va invalidata se il salvataggio
    // fallisce - resterebbe altrimenti sincronizzata con dati mai
    // effettivamente persistiti.
    expect(invalidaCachePermessiMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

vi.mock("server-only", () => ({}));

const queryRawMock = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRawMock } }));

const { salvaRisultatoSet, salvaBackup, leggiBackup } = await import("./referto-in-corso");

const RICHIESTA = {
  registroId: "123e4567-e89b-42d3-a456-426614174000",
  casa: 25,
  ospite: 20,
  seqFinale: 50,
};

describe("salvaRisultatoSet", () => {
  beforeEach(() => vi.resetAllMocks());

  it("restituisce la riga scritta dall'upsert, con parametri e non testo concatenato", async () => {
    queryRawMock.mockResolvedValueOnce([{ numeroSet: 1, casa: 25, ospite: 20, seqFinale: 50 }]);

    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).resolves.toEqual({
      numeroSet: 1,
      casa: 25,
      ospite: 20,
      seqFinale: 50,
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const [stringhe, ...valori] = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    expect(valori).toEqual(["p-1", 1, 25, 20, 50, RICHIESTA.registroId, 2]);
    const sql = stringhe.join("?");
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain('EXCLUDED."seqFinale" > "risultati_set_referto"."seqFinale"');
  });

  it("con un invio vecchio legge e restituisce la riga salvata", async () => {
    queryRawMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ numeroSet: 1, casa: 25, ospite: 23, seqFinale: 90 }]);

    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).resolves.toEqual({
      numeroSet: 1,
      casa: 25,
      ospite: 23,
      seqFinale: 90,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });

  it("lancia se la riga non esiste nemmeno dopo l'upsert", async () => {
    queryRawMock.mockResolvedValue([]);
    await expect(salvaRisultatoSet("p-1", 2, 1, RICHIESTA)).rejects.toThrow();
  });
});

describe("salvaBackup", () => {
  const BLOB = '{"v":1,"eventi":[]}';
  const HASH = createHash("sha256").update(BLOB, "utf8").digest("hex");
  const REGISTRO = "123e4567-e89b-42d3-a456-426614174000";
  const RICHIESTA = { registroId: REGISTRO, ultimoSeq: 10, hash: HASH, blob: BLOB };

  beforeEach(() => vi.resetAllMocks());

  it("con hash sbagliato non tocca il database", async () => {
    await expect(salvaBackup("p-1", 2, { ...RICHIESTA, hash: "0".repeat(64) })).resolves.toEqual({
      esito: "hash-errato",
    });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("restituisce la riga scritta, con parametri e regola di accettazione nell'SQL", async () => {
    queryRawMock.mockResolvedValueOnce([{ registroId: REGISTRO, ultimoSeq: 10 }]);

    await expect(salvaBackup("p-1", 2, RICHIESTA)).resolves.toEqual({
      esito: "ok",
      salvato: { registroId: REGISTRO, ultimoSeq: 10 },
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const [stringhe, ...valori] = queryRawMock.mock.calls[0] as [string[], ...unknown[]];
    expect(valori).toEqual(["p-1", REGISTRO, 2, 10, HASH, BLOB]);
    const sql = stringhe.join("?");
    expect(sql).toContain('ON CONFLICT ("partitaTorneoId") DO UPDATE');
    expect(sql).toContain('"backup_referto"."epoca" < EXCLUDED."epoca"');
    expect(sql).toContain('"backup_referto"."registroId" = EXCLUDED."registroId"');
    expect(sql).toContain('"backup_referto"."ultimoSeq" < EXCLUDED."ultimoSeq"');
  });

  it("con un invio vecchio o ripetuto (stesso registro) restituisce il salvato", async () => {
    queryRawMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ registroId: REGISTRO, epoca: 2, ultimoSeq: 90 }]);
    await expect(salvaBackup("p-1", 2, RICHIESTA)).resolves.toEqual({
      esito: "ok",
      salvato: { registroId: REGISTRO, ultimoSeq: 90 },
    });
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });

  it("con un altro registro nella stessa epoca e' conflitto", async () => {
    queryRawMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ registroId: "223e4567-e89b-42d3-a456-426614174000", epoca: 2, ultimoSeq: 90 }]);
    await expect(salvaBackup("p-1", 2, RICHIESTA)).resolves.toEqual({ esito: "conflitto" });
  });

  it("lancia se la riga non esiste nemmeno dopo l'upsert", async () => {
    queryRawMock.mockResolvedValue([]);
    await expect(salvaBackup("p-1", 2, RICHIESTA)).rejects.toThrow();
  });
});

describe("leggiBackup", () => {
  beforeEach(() => vi.resetAllMocks());

  it("restituisce null senza riga", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await expect(leggiBackup("p-1")).resolves.toBeNull();
  });

  it("restituisce il backup salvato", async () => {
    queryRawMock.mockResolvedValueOnce([
      { registroId: "r", epoca: 2, ultimoSeq: 5, hash: "h", blob: "b" },
    ]);
    await expect(leggiBackup("p-1")).resolves.toEqual({
      registroId: "r",
      epoca: 2,
      ultimoSeq: 5,
      hash: "h",
      blob: "b",
    });
  });
});

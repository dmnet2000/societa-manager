import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const assegnazioneUpdateManyMock = vi.fn();
const assegnazioneCreateManyMock = vi.fn();
const partitaFindManyMock = vi.fn();
const utenteFindManyMock = vi.fn();
const utenteFindUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assegnazioneTablet: {
      updateMany: assegnazioneUpdateManyMock,
      createMany: assegnazioneCreateManyMock,
    },
    partitaTorneo: { findMany: partitaFindManyMock },
    utente: { findMany: utenteFindManyMock, findUnique: utenteFindUniqueMock },
  },
}));

const { assegnaTabletPartita, elencaGareConAssegnazioneTablet, elencaTablet } = await import(
  "./assegnazioni-tablet"
);

describe("assegnaTabletPartita", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prima assegnazione: nessuna riga da cambiare, crea la riga (epoca 1 di default)", async () => {
    assegnazioneUpdateManyMock.mockResolvedValue({ count: 0 });
    assegnazioneCreateManyMock.mockResolvedValue({ count: 1 });

    await expect(assegnaTabletPartita("p1", "campo1")).resolves.toBe("creata");

    expect(assegnazioneCreateManyMock).toHaveBeenCalledWith({
      data: [{ partitaTorneoId: "p1", utenteId: "campo1" }],
      skipDuplicates: true,
    });
    // L'epoca iniziale e' il default dello schema (1): non viene passata.
    expect(assegnazioneCreateManyMock.mock.calls[0][0].data[0]).not.toHaveProperty("epoca");
  });

  it("riassegnazione: aggiorna tablet ed epoca +1 nella stessa istruzione, senza creare", async () => {
    assegnazioneUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(assegnaTabletPartita("p1", "campo2")).resolves.toBe("cambiata");

    expect(assegnazioneUpdateManyMock).toHaveBeenCalledWith({
      where: {
        partitaTorneoId: "p1",
        OR: [{ utenteId: null }, { utenteId: { not: "campo2" } }],
      },
      data: { utenteId: "campo2", epoca: { increment: 1 } },
    });
    expect(assegnazioneCreateManyMock).not.toHaveBeenCalled();
  });

  it("stesso tablet: nessuna riga cambiata e nessuna creata (duplicato saltato), epoca invariata", async () => {
    assegnazioneUpdateManyMock.mockResolvedValue({ count: 0 });
    assegnazioneCreateManyMock.mockResolvedValue({ count: 0 });

    await expect(assegnaTabletPartita("p1", "campo1")).resolves.toBe("invariata");
  });

  it("prima assegnazione concorrente con un altro tablet: la riga nata nel frattempo viene cambiata", async () => {
    // 1° cambio: nessuna riga; create: saltata (l'ha creata un'altra
    // richiesta con campo1); 2° cambio: la riga ha campo1, passa a campo2.
    assegnazioneUpdateManyMock.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    assegnazioneCreateManyMock.mockResolvedValue({ count: 0 });

    await expect(assegnaTabletPartita("p1", "campo2")).resolves.toBe("cambiata");
    expect(assegnazioneUpdateManyMock).toHaveBeenCalledTimes(2);
  });

  it("tablet tolto: solo una riga con un tablet passa a nessun tablet con epoca +1", async () => {
    assegnazioneUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(assegnaTabletPartita("p1", null)).resolves.toBe("cambiata");

    expect(assegnazioneUpdateManyMock).toHaveBeenCalledWith({
      where: { partitaTorneoId: "p1", utenteId: { not: null } },
      data: { utenteId: null, epoca: { increment: 1 } },
    });
    expect(assegnazioneCreateManyMock).not.toHaveBeenCalled();
  });

  it("nessun tablet su una gara senza riga o gia' vuota: nessuna scrittura", async () => {
    assegnazioneUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(assegnaTabletPartita("p1", null)).resolves.toBe("invariata");
    expect(assegnazioneCreateManyMock).not.toHaveBeenCalled();
  });
});

// La matrice della story 2.5 chiede due comportamenti che vivono solo nel
// database: le assegnazioni spariscono con le partite (CASCADE) e la tabella
// e' negata ai ruoli client (AD-17). Si verificano sul testo della
// migrazione; la prova reale e' il passo hitl sul progetto di prova.
describe("migrazione assegnazioni_tablet", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const sql = readFileSync(
    join(process.cwd(), "prisma/migrations/20261112000000_add_assegnazioni_tablet/migration.sql"),
    "utf8"
  );

  it("cancellare una partita cancella la sua assegnazione", () => {
    expect(sql).toMatch(
      /FOREIGN KEY \("partitaTorneoId"\) REFERENCES "partite_torneo"\("id"\) ON DELETE CASCADE/
    );
  });

  it("una sola assegnazione per gara", () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX [^;]+ON "assegnazioni_tablet"\("partitaTorneoId"\)/);
  });

  it("RLS attiva senza policy e nessun privilegio ai ruoli client", () => {
    expect(sql).toContain('ALTER TABLE "assegnazioni_tablet" ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('REVOKE ALL ON "assegnazioni_tablet" FROM anon, authenticated;');
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/\bGRANT\b/i);
  });
});

describe("letture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elencaGareConAssegnazioneTablet filtra per Edizione e ordina per numero", async () => {
    partitaFindManyMock.mockResolvedValue([]);
    await elencaGareConAssegnazioneTablet("ed1");
    const arg = partitaFindManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ edizioneTorneoId: "ed1" });
    expect(arg.orderBy).toEqual([{ numero: "asc" }]);
    expect(arg.include.assegnazioneTablet).toBeTruthy();
  });

  it("elencaTablet legge solo gli utenti con ruolo TABLET, senza dati oltre id/email/attivo", async () => {
    utenteFindManyMock.mockResolvedValue([]);
    await elencaTablet();
    expect(utenteFindManyMock).toHaveBeenCalledWith({
      where: { ruoli: { some: { ruolo: "TABLET" } } },
      select: { id: true, email: true, attivo: true },
      orderBy: { email: "asc" },
    });
  });
});

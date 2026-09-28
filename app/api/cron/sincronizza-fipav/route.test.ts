import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Story 10.12 (review fix, 2026-09-28): riscritto dopo il bug di produzione
// - il cron elabora UN SOLO Campionato per invocazione (rotazione sul meno
// recentemente sincronizzato), non piu' tutti insieme. Mirror di
// app/api/cron/promemoria-certificati/route.test.ts per lo scope minimo
// (autorizzazione + comportamento di questa storia), non il dettaglio
// fetch/parsing/upsert (coperto da lib/sincronizza-gare-fipav/sincronizza.test.ts).

const findManyMock = vi.fn();
const updateMock = vi.fn();
const sincronizzaCampionatoFipavMock = vi.fn();
const leggiFrequenzaMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campionato: { findMany: findManyMock, update: updateMock },
  },
}));

vi.mock("@/lib/sincronizza-gare-fipav/sincronizza", () => ({
  sincronizzaCampionatoFipav: sincronizzaCampionatoFipavMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  leggiFrequenzaSincronizzazioneFipavOre: leggiFrequenzaMock,
}));

const { GET } = await import("./route");

function buildRequest(authorization?: string) {
  return new NextRequest("https://example.test/api/cron/sincronizza-fipav", {
    headers: authorization ? { authorization } : undefined,
  });
}

function campionato(overrides: Partial<{
  id: string;
  gruppoId: string;
  linkFipav: string;
  ultimaSincronizzazioneFipavIl: Date | null;
}> = {}) {
  return {
    id: "campionato-1",
    gruppoId: "gruppo-1",
    linkFipav: "https://risultati.fipav.it/campionato/1",
    ultimaSincronizzazioneFipavIl: null,
    ...overrides,
  };
}

const RISULTATO_RIUSCITO = {
  success: true as const,
  create: 1,
  aggiornate: 2,
  bloccate: 0,
  scartate: [],
};

describe("GET /api/cron/sincronizza-fipav", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "il-segreto-giusto");
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([campionato()]);
    updateMock.mockReset();
    updateMock.mockResolvedValue(undefined);
    sincronizzaCampionatoFipavMock.mockReset();
    sincronizzaCampionatoFipavMock.mockResolvedValue(RISULTATO_RIUSCITO);
    leggiFrequenzaMock.mockReset();
    leggiFrequenzaMock.mockResolvedValue(null);
  });

  it("returns 401 and touches nothing without the correct CRON_SECRET", async () => {
    const response = await GET(buildRequest("Bearer sbagliato"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "UNAUTHORIZED" });
    expect(findManyMock).not.toHaveBeenCalled();
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("returns 401 and touches nothing without any Authorization header", async () => {
    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 500 LETTURA_FALLITA, no sync attempted, when reading the frequency configuration fails", async () => {
    leggiFrequenzaMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "LETTURA_FALLITA" });
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("returns 500 LETTURA_FALLITA, no sync attempted, when enumerating Campionati fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "LETTURA_FALLITA" });
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("skips execution with an explicit reason when no Campionato has a linkFipav configured", async () => {
    findManyMock.mockResolvedValue([]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.eseguito).toBe(false);
    expect(typeof body.motivo).toBe("string");
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("skips execution when every Campionato was synced within the configured frequency window", async () => {
    leggiFrequenzaMock.mockResolvedValue(24);
    findManyMock.mockResolvedValue([
      campionato({ ultimaSincronizzazioneFipavIl: new Date(Date.now() - 1 * 60 * 60 * 1000) }), // 1h fa
    ]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.eseguito).toBe(false);
    expect(typeof body.motivo).toBe("string");
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("syncs a never-synced Campionato (ultimaSincronizzazioneFipavIl null) using the 24h fallback when no frequency is configured", async () => {
    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledWith({
      gruppoId: "gruppo-1",
      campionatoId: "campionato-1",
      linkFipav: "https://risultati.fipav.it/campionato/1",
    });
    expect(body).toEqual({
      eseguito: true,
      campionatoId: "campionato-1",
      esito: "riuscito",
      creati: 1,
      aggiornati: 2,
      bloccati: 0,
      scartati: 0,
    });
  });

  it("updates only the synced Campionato's own timestamp, never a global one", async () => {
    await GET(buildRequest("Bearer il-segreto-giusto"));

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "campionato-1" },
      data: { ultimaSincronizzazioneFipavIl: expect.any(Date) },
    });
  });

  // Review fix (bug di produzione): il cuore della rotazione - tra piu'
  // Campionati "dovuti", sceglie sempre il meno recentemente sincronizzato
  // (mai sincronizzato = per primo), mai piu' di uno per chiamata.
  it("picks the least-recently-synced due Campionato when several are due, and syncs only that one", async () => {
    leggiFrequenzaMock.mockResolvedValue(1); // tutti "dovuti" nel test
    findManyMock.mockResolvedValue([
      campionato({
        id: "campionato-recente",
        ultimaSincronizzazioneFipavIl: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h fa
      }),
      campionato({
        id: "campionato-mai-sincronizzato",
        ultimaSincronizzazioneFipavIl: null,
      }),
      campionato({
        id: "campionato-vecchio",
        ultimaSincronizzazioneFipavIl: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10h fa
      }),
    ]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    // "mai sincronizzato" viene prima di qualunque data reale (per design,
    // ilPiuVecchioPrimo).
    expect(body.campionatoId).toBe("campionato-mai-sincronizzato");
    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledTimes(1);
  });

  it("only considers Campionati whose sync window has actually elapsed when choosing who's next", async () => {
    leggiFrequenzaMock.mockResolvedValue(24);
    findManyMock.mockResolvedValue([
      campionato({
        id: "campionato-non-dovuto",
        ultimaSincronizzazioneFipavIl: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1h fa, non dovuto
      }),
      campionato({
        id: "campionato-dovuto",
        ultimaSincronizzazioneFipavIl: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h fa, dovuto
      }),
    ]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.campionatoId).toBe("campionato-dovuto");
  });

  // Review fix: il timestamp NON avanza su un fallimento - il Campionato
  // resta il "piu' vecchio" e viene ritentato al battito successivo (10
  // minuti dopo), non bloccato per l'intera finestra di frequenza.
  it("does not advance the timestamp when the sync returns an error, so the next tick retries it", async () => {
    sincronizzaCampionatoFipavMock.mockResolvedValue({
      error: { code: "INTERNAL", message: "Impossibile raggiungere il portale FIPAV." },
    });

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body).toEqual({
      eseguito: true,
      campionatoId: "campionato-1",
      esito: "fallito",
      errore: "Impossibile raggiungere il portale FIPAV.",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not advance the timestamp when the sync throws unexpectedly", async () => {
    sincronizzaCampionatoFipavMock.mockRejectedValue(new Error("crash inatteso"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body).toEqual({
      eseguito: true,
      campionatoId: "campionato-1",
      esito: "fallito",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns a 500 explicit error, not an unhandled exception, when persisting the Campionato's timestamp fails", async () => {
    updateMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "SCRITTURA_FALLITA" });
  });
});

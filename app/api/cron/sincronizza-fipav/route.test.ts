import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Story 10.12 (review fix, 2026-09-28): il cron elabora UN SOLO Campionato
// per invocazione (il meno recentemente sincronizzato). Richiesta utente
// 2026-10-01: ciclo notturno - "dovuti" = mai sincronizzati o prima di
// `dal`, `escludi` per i falliti del giro, `rimanenti` in risposta. Mirror di
// app/api/cron/promemoria-certificati/route.test.ts per lo scope minimo
// (autorizzazione + comportamento di questa storia), non il dettaglio
// fetch/parsing/upsert (coperto da lib/sincronizza-gare-fipav/sincronizza.test.ts).

const findManyMock = vi.fn();
const updateMock = vi.fn();
const sincronizzaCampionatoFipavMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campionato: { findMany: findManyMock, update: updateMock },
  },
}));

vi.mock("@/lib/sincronizza-gare-fipav/sincronizza", () => ({
  sincronizzaCampionatoFipav: sincronizzaCampionatoFipavMock,
}));

const { GET } = await import("./route");

const DAL = "2026-10-01T00:00:00.000Z";
const PRIMA_DI_DAL = new Date("2026-09-30T00:05:00.000Z"); // notte precedente
const DOPO_DAL = new Date("2026-10-01T00:01:00.000Z"); // gia' fatto in questo ciclo

function buildRequest(authorization?: string, query = `dal=${DAL}`) {
  return new NextRequest(`https://example.test/api/cron/sincronizza-fipav?${query}`, {
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

  it("returns 400 and touches nothing when dal is missing or invalid", async () => {
    for (const query of ["", "dal=", "dal=non-una-data"]) {
      const response = await GET(buildRequest("Bearer il-segreto-giusto", query));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "PARAMETRO_DAL_NON_VALIDO" });
    }
    expect(findManyMock).not.toHaveBeenCalled();
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
    expect(body.rimanenti).toBe(0);
    expect(typeof body.motivo).toBe("string");
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("skips execution when every Campionato was already synced in this cycle (after dal)", async () => {
    findManyMock.mockResolvedValue([campionato({ ultimaSincronizzazioneFipavIl: DOPO_DAL })]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.eseguito).toBe(false);
    expect(body.rimanenti).toBe(0);
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("syncs a never-synced Campionato and reports how many remain", async () => {
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
      rimanenti: 0,
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

  it("picks the least-recently-synced due Campionato, syncs only that one, and counts the others as remaining", async () => {
    findManyMock.mockResolvedValue([
      campionato({
        id: "campionato-recente",
        ultimaSincronizzazioneFipavIl: new Date("2026-09-30T01:00:00.000Z"),
      }),
      campionato({ id: "campionato-mai-sincronizzato", ultimaSincronizzazioneFipavIl: null }),
      campionato({
        id: "campionato-vecchio",
        ultimaSincronizzazioneFipavIl: new Date("2026-09-29T00:05:00.000Z"),
      }),
      campionato({ id: "campionato-gia-fatto", ultimaSincronizzazioneFipavIl: DOPO_DAL }),
    ]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    // "mai sincronizzato" viene prima di qualunque data reale (per design,
    // ilPiuVecchioPrimo); "gia' fatto" (dopo dal) non conta tra i rimanenti.
    expect(body.campionatoId).toBe("campionato-mai-sincronizzato");
    expect(body.rimanenti).toBe(2);
    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledTimes(1);
  });

  it("never picks or counts a Campionato listed in escludi (failed earlier in this run)", async () => {
    findManyMock.mockResolvedValue([
      campionato({ id: "campionato-fallito", ultimaSincronizzazioneFipavIl: null }),
      campionato({ id: "campionato-altro", ultimaSincronizzazioneFipavIl: PRIMA_DI_DAL }),
      campionato({ id: "campionato-terzo", ultimaSincronizzazioneFipavIl: PRIMA_DI_DAL }),
    ]);

    const response = await GET(
      buildRequest("Bearer il-segreto-giusto", `dal=${DAL}&escludi=campionato-fallito,,`)
    );
    const body = await response.json();

    expect(body.campionatoId).not.toBe("campionato-fallito");
    expect(body.rimanenti).toBe(1);
  });

  // Il timestamp NON avanza su un fallimento - il Campionato resta "dovuto"
  // e viene ritentato alla ripresa successiva del ciclo notturno.
  it("does not advance the timestamp when the sync returns an error, and still reports remaining", async () => {
    findManyMock.mockResolvedValue([
      campionato(),
      campionato({ id: "campionato-2", ultimaSincronizzazioneFipavIl: PRIMA_DI_DAL }),
    ]);
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
      rimanenti: 1,
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
      rimanenti: 0,
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

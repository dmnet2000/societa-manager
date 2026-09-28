import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Story 10.12: mirror diretto di
// app/api/cron/promemoria-certificati/route.test.ts (Story 4.6) - stesso
// scope minimo (autorizzazione + comportamento nuovo di questa storia), non
// il dettaglio fetch/parsing/upsert (coperto da
// lib/sincronizza-gare-fipav/sincronizza.test.ts).

const findManyMock = vi.fn();
const sincronizzaCampionatoFipavMock = vi.fn();
const leggiFrequenzaMock = vi.fn();
const leggiUltimaEsecuzioneMock = vi.fn();
const segnaEseguitaMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campionato: { findMany: findManyMock },
  },
}));

vi.mock("@/lib/sincronizza-gare-fipav/sincronizza", () => ({
  sincronizzaCampionatoFipav: sincronizzaCampionatoFipavMock,
}));

vi.mock("@/lib/configurazione-applicazione", () => ({
  leggiFrequenzaSincronizzazioneFipavOre: leggiFrequenzaMock,
  leggiUltimaSincronizzazioneFipavAutomaticaIl: leggiUltimaEsecuzioneMock,
  segnaSincronizzazioneFipavAutomaticaEseguita: segnaEseguitaMock,
}));

const { GET } = await import("./route");

function buildRequest(authorization?: string) {
  return new NextRequest("https://example.test/api/cron/sincronizza-fipav", {
    headers: authorization ? { authorization } : undefined,
  });
}

const CAMPIONATO = {
  id: "campionato-1",
  gruppoId: "gruppo-1",
  linkFipav: "https://risultati.fipav.it/campionato/1",
};

describe("GET /api/cron/sincronizza-fipav", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "il-segreto-giusto");
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([CAMPIONATO]);
    sincronizzaCampionatoFipavMock.mockReset();
    sincronizzaCampionatoFipavMock.mockResolvedValue({
      success: true,
      create: 1,
      aggiornate: 2,
      bloccate: 0,
      scartate: [],
    });
    leggiFrequenzaMock.mockReset();
    leggiFrequenzaMock.mockResolvedValue(null);
    leggiUltimaEsecuzioneMock.mockReset();
    leggiUltimaEsecuzioneMock.mockResolvedValue(null);
    segnaEseguitaMock.mockReset();
    segnaEseguitaMock.mockResolvedValue(undefined);
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

  // Review fix (Verification Gap Reviewer): i due rami LETTURA_FALLITA non
  // erano mai esercitati, pur avendo ciascuno un try/catch dedicato nel
  // codice - stesso gap gia' presente in promemoria-certificati/route.ts
  // (Story 4.6), qui colmato invece di essere solo ereditato.
  it("returns 500 LETTURA_FALLITA, no sync attempted, when reading the frequency/last-run configuration fails", async () => {
    leggiFrequenzaMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "LETTURA_FALLITA" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 500 LETTURA_FALLITA, no sync attempted, when enumerating Campionati fails", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "LETTURA_FALLITA" });
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
  });

  it("skips execution and makes no external request when the configured frequency has not elapsed yet", async () => {
    leggiFrequenzaMock.mockResolvedValue(24);
    leggiUltimaEsecuzioneMock.mockResolvedValue(new Date(Date.now() - 1 * 60 * 60 * 1000)); // 1h fa

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.eseguito).toBe(false);
    expect(typeof body.motivo).toBe("string");
    expect(findManyMock).not.toHaveBeenCalled();
    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
    expect(segnaEseguitaMock).not.toHaveBeenCalled();
  });

  it("executes when the configured frequency has elapsed, syncing every Campionato with linkFipav and updating the timestamp", async () => {
    leggiFrequenzaMock.mockResolvedValue(8);
    leggiUltimaEsecuzioneMock.mockResolvedValue(new Date(Date.now() - 9 * 60 * 60 * 1000)); // 9h fa

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { linkFipav: { not: null } },
      select: { id: true, gruppoId: true, linkFipav: true },
    });
    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledWith({
      gruppoId: "gruppo-1",
      campionatoId: "campionato-1",
      linkFipav: "https://risultati.fipav.it/campionato/1",
    });
    expect(segnaEseguitaMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      eseguito: true,
      campionatiTotali: 1,
      sincronizzati: 1,
      falliti: 0,
      creati: 1,
      aggiornati: 2,
      bloccati: 0,
      scartati: 0,
    });
  });

  it("executes when never run before (ultimaEsecuzione null), no fallback frequency configured (24h default)", async () => {
    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledTimes(1);
    expect(body.eseguito).toBe(true);
    expect(segnaEseguitaMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty-but-successful summary when no Campionato has a linkFipav configured", async () => {
    findManyMock.mockResolvedValue([]);

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(sincronizzaCampionatoFipavMock).not.toHaveBeenCalled();
    expect(body).toEqual({
      eseguito: true,
      campionatiTotali: 0,
      sincronizzati: 0,
      falliti: 0,
      creati: 0,
      aggiornati: 0,
      bloccati: 0,
      scartati: 0,
    });
    expect(segnaEseguitaMock).toHaveBeenCalledTimes(1);
  });

  it("does not let one failing Campionato block the others (fail-soft per Campionato)", async () => {
    findManyMock.mockResolvedValue([
      CAMPIONATO,
      { id: "campionato-2", gruppoId: "gruppo-2", linkFipav: "https://risultati.fipav.it/2" },
    ]);
    sincronizzaCampionatoFipavMock
      .mockResolvedValueOnce({
        error: { code: "INTERNAL", message: "Impossibile raggiungere il portale FIPAV." },
      })
      .mockResolvedValueOnce({
        success: true,
        create: 0,
        aggiornate: 1,
        bloccate: 0,
        scartate: [],
      });

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(sincronizzaCampionatoFipavMock).toHaveBeenCalledTimes(2);
    expect(body).toEqual({
      eseguito: true,
      campionatiTotali: 2,
      sincronizzati: 1,
      falliti: 1,
      creati: 0,
      aggiornati: 1,
      bloccati: 0,
      scartati: 0,
    });
    expect(segnaEseguitaMock).toHaveBeenCalledTimes(1);
  });

  it("counts an unexpected thrown error from sincronizzaCampionatoFipav as falliti too, without stopping the loop", async () => {
    findManyMock.mockResolvedValue([
      CAMPIONATO,
      { id: "campionato-2", gruppoId: "gruppo-2", linkFipav: "https://risultati.fipav.it/2" },
    ]);
    sincronizzaCampionatoFipavMock
      .mockRejectedValueOnce(new Error("crash inatteso"))
      .mockResolvedValueOnce({
        success: true,
        create: 1,
        aggiornate: 0,
        bloccate: 0,
        scartate: [],
      });

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body).toEqual({
      eseguito: true,
      campionatiTotali: 2,
      sincronizzati: 1,
      falliti: 1,
      creati: 1,
      aggiornati: 0,
      bloccati: 0,
      scartati: 0,
    });
  });

  // Review fix (Edge Case Hunter): risultato.scartate veniva calcolato ma
  // mai sommato nel riepilogo - un'esecuzione automatica non presidiata con
  // righe scartate lo segnalava solo nei log server, mai nella risposta.
  it("aggregates scartate rows from every Campionato into a single scartati count", async () => {
    sincronizzaCampionatoFipavMock.mockResolvedValue({
      success: true,
      create: 0,
      aggiornate: 0,
      bloccate: 0,
      scartate: [
        { numeroRiga: 1, motivo: "Numero gara mancante" },
        { numeroRiga: 3, motivo: "Data non riconosciuta" },
      ],
    });

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(body.scartati).toBe(2);
  });

  // Review fix (Edge Case Hunter): senza try/catch attorno a questa
  // scrittura, un fallimento del DB dopo una sincronizzazione riuscita
  // lanciava un'eccezione non gestita invece di restituire il riepilogo (o
  // almeno un errore esplicito).
  it("returns a 500 explicit error, not an unhandled exception, when persisting the timestamp fails", async () => {
    segnaEseguitaMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest("Bearer il-segreto-giusto"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "SCRITTURA_FALLITA" });
  });
});

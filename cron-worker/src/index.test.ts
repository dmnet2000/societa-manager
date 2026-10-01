import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

// Richiesta utente 2026-10-01: ciclo notturno di sincronizzazione FIPAV alle
// 2:00 ora italiana con 1 minuto di pausa tra un Campionato e l'altro.

const ENV = { CRON_SECRET: "segreto", CRON_ENDPOINT_URL: "https://app.example/" };
const CRON_FIPAV = "0,15,30,45 0,1 * * *";

// 2:00 a Roma: 00:00 UTC con l'ora legale (ottobre), 01:00 UTC con l'ora
// solare (dicembre).
const DUE_DI_NOTTE_ORA_LEGALE = Date.parse("2026-10-02T00:00:00.000Z");
const DUE_DI_NOTTE_ORA_SOLARE = Date.parse("2026-12-02T01:00:00.000Z");

function risposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status });
}

async function eseguiCron(cron: string, scheduledTime: number) {
  const promesse: Promise<unknown>[] = [];
  await worker.scheduled({ cron, scheduledTime }, ENV, {
    waitUntil: (p) => promesse.push(p),
  });
  // Fa avanzare le pause di 1 minuto finche' il giro non finisce.
  const tutto = Promise.all(promesse);
  await vi.runAllTimersAsync();
  await tutto;
}

const fetchMock = vi.fn();

describe("cron-worker scheduled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("alle 2:00 di Roma (ora legale) chiama l'endpoint finche' restano Campionati, con 1 minuto tra uno e l'altro", async () => {
    vi.setSystemTime(DUE_DI_NOTTE_ORA_LEGALE);
    const istanti: number[] = [];
    fetchMock.mockImplementation(async () => {
      istanti.push(Date.now());
      const n = istanti.length;
      return risposta({ eseguito: true, campionatoId: `c${n}`, esito: "riuscito", rimanenti: 3 - n });
    });

    await eseguiCron(CRON_FIPAV, DUE_DI_NOTTE_ORA_LEGALE);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(istanti[1] - istanti[0]).toBe(60_000);
    expect(istanti[2] - istanti[1]).toBe(60_000);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://app.example/api/cron/sincronizza-fipav");
    // dal = 2 ore prima dell'inizio del ciclo (include la notte, esclude quella precedente).
    expect(parsed.searchParams.get("dal")).toBe("2026-10-01T22:00:00.000Z");
    expect(init.headers).toEqual({ Authorization: "Bearer segreto" });
  });

  it("con l'ora solare il ciclo parte all'01:00 UTC (le 2:00 di Roma)", async () => {
    vi.setSystemTime(DUE_DI_NOTTE_ORA_SOLARE);
    fetchMock.mockResolvedValue(risposta({ eseguito: false, rimanenti: 0 }));

    await eseguiCron(CRON_FIPAV, DUE_DI_NOTTE_ORA_SOLARE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("non fa nulla quando il trigger scatta in un'ora che a Roma non sono le 2", async () => {
    // 01:00 UTC in ottobre = 3:00 a Roma; 00:00 UTC in dicembre = 1:00 a Roma.
    for (const istante of [Date.parse("2026-10-02T01:00:00.000Z"), Date.parse("2026-12-02T00:00:00.000Z")]) {
      vi.setSystemTime(istante);
      await eseguiCron(CRON_FIPAV, istante);
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("esclude per il resto del giro un Campionato fallito", async () => {
    vi.setSystemTime(DUE_DI_NOTTE_ORA_LEGALE);
    fetchMock
      .mockResolvedValueOnce(risposta({ eseguito: true, campionatoId: "rotto", esito: "fallito", rimanenti: 1 }))
      .mockResolvedValueOnce(risposta({ eseguito: true, campionatoId: "ok", esito: "riuscito", rimanenti: 0 }));

    await eseguiCron(CRON_FIPAV, DUE_DI_NOTTE_ORA_LEGALE);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("escludi")).toBeNull();
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("escludi")).toBe("rotto");
  });

  it("si ferma su una risposta di errore HTTP (ripresa al quarto d'ora successivo)", async () => {
    vi.setSystemTime(DUE_DI_NOTTE_ORA_LEGALE);
    fetchMock.mockResolvedValue(risposta({ error: "SCRITTURA_FALLITA" }, 500));

    await eseguiCron(CRON_FIPAV, DUE_DI_NOTTE_ORA_LEGALE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resta sotto il limite di 15 minuti: con molti Campionati il giro si ferma e lascia il resto alla ripresa", async () => {
    vi.setSystemTime(DUE_DI_NOTTE_ORA_LEGALE);
    fetchMock.mockImplementation(async () =>
      risposta({ eseguito: true, campionatoId: "c", esito: "riuscito", rimanenti: 50 })
    );

    await eseguiCron(CRON_FIPAV, DUE_DI_NOTTE_ORA_LEGALE);

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(13);
    expect(Date.now() - DUE_DI_NOTTE_ORA_LEGALE).toBeLessThan(15 * 60_000);
  });

  it("il promemoria certificati resta una sola chiamata alle 6:00 UTC", async () => {
    fetchMock.mockResolvedValue(risposta({ processati: 0 }));

    await eseguiCron("0 6 * * *", Date.parse("2026-10-02T06:00:00.000Z"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://app.example/api/cron/promemoria-certificati");
  });
});

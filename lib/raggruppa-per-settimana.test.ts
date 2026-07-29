import { describe, expect, it, vi } from "vitest";
import { raggruppaPerSettimana, MAX_SETTIMANE } from "./raggruppa-per-settimana";

type PartitaDiTest = { data: string; ora: string; id: string };

function partita(data: string, ora: string, id: string): PartitaDiTest {
  return { data, ora, id };
}

describe("raggruppaPerSettimana", () => {
  it("ritorna un array vuoto se non ci sono partite", () => {
    expect(raggruppaPerSettimana([])).toEqual([]);
  });

  it("raggruppa una singola settimana (lunedì-domenica) con più partite", () => {
    const risultato = raggruppaPerSettimana([
      partita("2025-10-22", "20:30", "mercoledi"),
      partita("2025-10-20", "18:00", "lunedi"),
    ]);

    expect(risultato).toHaveLength(1);
    expect(risultato[0]).toMatchObject({
      chiave: "2025-10-20",
      inizio: "2025-10-20",
      fine: "2025-10-26",
      etichetta: "20 ottobre - 26 ottobre 2025",
    });
    expect(risultato[0].partite.map((p) => p.id)).toEqual(["lunedi", "mercoledi"]);
  });

  it("assegna una partita di domenica alla settimana che inizia il lunedì PRECEDENTE, non quello successivo", () => {
    const risultato = raggruppaPerSettimana([partita("2025-10-26", "16:00", "domenica")]);

    expect(risultato).toHaveLength(1);
    expect(risultato[0].inizio).toBe("2025-10-20");
    expect(risultato[0].fine).toBe("2025-10-26");
  });

  it("genera le settimane intermedie senza partite quando c'è un buco nel calendario (AC #4)", () => {
    const risultato = raggruppaPerSettimana([
      partita("2025-10-20", "18:00", "prima"),
      partita("2025-11-10", "18:00", "terza-settimana-dopo"),
    ]);

    expect(risultato).toHaveLength(4);
    expect(risultato.map((s) => s.inizio)).toEqual([
      "2025-10-20",
      "2025-10-27",
      "2025-11-03",
      "2025-11-10",
    ]);
    expect(risultato[0].partite).toHaveLength(1);
    expect(risultato[1].partite).toEqual([]);
    expect(risultato[2].partite).toEqual([]);
    expect(risultato[3].partite).toHaveLength(1);
  });

  it("ordina le partite della stessa settimana per data e poi per ora crescenti", () => {
    const risultato = raggruppaPerSettimana([
      partita("2025-10-22", "20:30", "mercoledi-sera"),
      partita("2025-10-22", "10:00", "mercoledi-mattina"),
      partita("2025-10-20", "18:00", "lunedi"),
    ]);

    expect(risultato[0].partite.map((p) => p.id)).toEqual([
      "lunedi",
      "mercoledi-mattina",
      "mercoledi-sera",
    ]);
  });

  it("formatta correttamente l'etichetta di una settimana a cavallo tra due anni", () => {
    const risultato = raggruppaPerSettimana([partita("2025-12-31", "20:00", "capodanno")]);

    expect(risultato[0]).toMatchObject({
      inizio: "2025-12-29",
      fine: "2026-01-04",
      etichetta: "29 dicembre 2025 - 4 gennaio 2026",
    });
  });

  it("ignora (senza crashare) una riga con data non parsabile, invece di lanciare RangeError (review fix)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const risultato = raggruppaPerSettimana([
      partita("data-non-valida", "20:00", "corrotta"),
      partita("2025-10-20", "18:00", "valida"),
    ]);

    expect(risultato).toHaveLength(1);
    expect(risultato[0].partite.map((p) => p.id)).toEqual(["valida"]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("ritorna un array vuoto se tutte le righe hanno una data non parsabile", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(raggruppaPerSettimana([partita("non una data", "20:00", "corrotta")])).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("tronca a MAX_SETTIMANE invece di generare un intervallo enorme per una data estrema ma valida (review fix)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const risultato = raggruppaPerSettimana([
      partita("2025-01-06", "18:00", "vicina"),
      partita("9999-12-31", "18:00", "lontanissima"),
    ]);

    expect(risultato.length).toBe(MAX_SETTIMANE);
    expect(risultato[0].partite.map((p) => p.id)).toEqual(["vicina"]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("ordina per ora crescente anche con orari non zero-paddati (review fix, es. '9:00' prima di '20:30')", () => {
    const risultato = raggruppaPerSettimana([
      partita("2025-10-20", "20:30", "sera"),
      partita("2025-10-20", "9:00", "mattina"),
    ]);

    expect(risultato[0].partite.map((p) => p.id)).toEqual(["mattina", "sera"]);
  });

  it("usa sempre UTC per formattare l'etichetta, indipendentemente dal fuso orario locale del processo (review fix)", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "America/New_York";

    const risultato = raggruppaPerSettimana([partita("2025-10-20", "18:00", "lunedi")]);

    expect(risultato[0].etichetta).toBe("20 ottobre - 26 ottobre 2025");

    process.env.TZ = originalTz;
  });
});

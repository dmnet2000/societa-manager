import { afterEach, describe, expect, it, vi } from "vitest";
import { dataEstesaRigaPartita, partiDataRigaPartita } from "./data-riga-partita";

afterEach(() => {
  vi.restoreAllMocks();
});

// Rende significativo il vincolo "solo UTC": i getter locali lanciano, quindi
// un'implementazione che usasse getDay/getDate/getMonth/getFullYear (fuso
// locale del processo) farebbe fallire il test a prescindere dal TZ di chi
// lo esegue.
function vietaGetterLocali() {
  for (const metodo of ["getDay", "getDate", "getMonth", "getFullYear"] as const) {
    vi.spyOn(Date.prototype, metodo).mockImplementation(() => {
      throw new Error(`getter locale ${metodo} usato: deve essere UTC`);
    });
  }
}

describe("partiDataRigaPartita", () => {
  it("mercoledi' 30 settembre 2026", () => {
    expect(partiDataRigaPartita("2026-09-30")).toEqual({
      giorno: "MER",
      numero: "30",
      mese: "SET",
    });
  });

  it("numero del giorno sempre a due cifre", () => {
    expect(partiDataRigaPartita("2026-10-02")).toEqual({
      giorno: "VEN",
      numero: "02",
      mese: "OTT",
    });
  });

  it("domenica e dicembre (estremi degli indici)", () => {
    expect(partiDataRigaPartita("2026-12-27")).toEqual({
      giorno: "DOM",
      numero: "27",
      mese: "DIC",
    });
  });

  it("gennaio e lunedi'", () => {
    expect(partiDataRigaPartita("2027-01-04")).toEqual({
      giorno: "LUN",
      numero: "04",
      mese: "GEN",
    });
  });

  it("usa solo getter UTC: bordi di mese e anno non scivolano di un giorno", () => {
    vietaGetterLocali();
    // Con un fuso negativo, la mezzanotte UTC del 1 gennaio sarebbe il 31
    // dicembre dell'anno prima in ora locale (e viceversa per il 31/12 con un
    // fuso positivo): solo i getter UTC danno il giorno scritto nella stringa.
    expect(partiDataRigaPartita("2027-01-01")).toEqual({ giorno: "VEN", numero: "01", mese: "GEN" });
    expect(partiDataRigaPartita("2026-12-31")).toEqual({ giorno: "GIO", numero: "31", mese: "DIC" });
    expect(partiDataRigaPartita("2026-03-01")).toEqual({ giorno: "DOM", numero: "01", mese: "MAR" });
  });

  it("data non parsabile -> null", () => {
    expect(partiDataRigaPartita("non-una-data")).toBeNull();
    expect(partiDataRigaPartita("")).toBeNull();
  });
});

describe("dataEstesaRigaPartita", () => {
  it("mercoledì 30 settembre 2026", () => {
    expect(dataEstesaRigaPartita("2026-09-30")).toBe("mercoledì 30 settembre 2026");
  });

  it("giorno senza zero iniziale, nomi con accento", () => {
    expect(dataEstesaRigaPartita("2026-10-02")).toBe("venerdì 2 ottobre 2026");
    expect(dataEstesaRigaPartita("2027-01-04")).toBe("lunedì 4 gennaio 2027");
  });

  it("usa solo getter UTC ai bordi dell'anno", () => {
    vietaGetterLocali();
    expect(dataEstesaRigaPartita("2027-01-01")).toBe("venerdì 1 gennaio 2027");
    expect(dataEstesaRigaPartita("2026-12-31")).toBe("giovedì 31 dicembre 2026");
  });

  it("data non parsabile -> null", () => {
    expect(dataEstesaRigaPartita("boh")).toBeNull();
  });
});

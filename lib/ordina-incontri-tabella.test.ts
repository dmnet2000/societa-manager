import { describe, expect, it } from "vitest";
import {
  ETICHETTA_RISULTATO_MANCANTE,
  ordinaIncontriPerColonna,
  prossimoOrdinamento,
} from "./ordina-incontri-tabella";

type Riga = {
  id: string;
  numero: number;
  fase: "GIRONE" | "SEMIFINALE" | "FINALE_VINCENTI" | "FINALE_PERDENTI";
  tabellone: "POSIZIONI_1_4" | "POSIZIONI_5_8" | null;
  squadraCasa: { nome: string; girone: "GIRONE_A" | "GIRONE_B" };
  squadraOspite: { nome: string };
  set1Casa: number | null;
  set1Ospite: number | null;
  set2Casa: number | null;
  set2Ospite: number | null;
  set3Casa: number | null;
  set3Ospite: number | null;
  slotTorneo: { data: string; ora: string } | null;
};

function partita(overrides: Partial<Riga> & { id: string }): Riga {
  return {
    numero: 1,
    fase: "GIRONE",
    tabellone: null,
    squadraCasa: { nome: "Squadra Casa", girone: "GIRONE_A" },
    squadraOspite: { nome: "Squadra Ospite" },
    set1Casa: null,
    set1Ospite: null,
    set2Casa: null,
    set2Ospite: null,
    set3Casa: null,
    set3Ospite: null,
    slotTorneo: null,
    ...overrides,
  };
}

describe("ordinaIncontriPerColonna", () => {
  it('ordina per "numero" crescente', () => {
    const partite = [partita({ id: "b", numero: 5 }), partita({ id: "a", numero: 2 })];

    expect(ordinaIncontriPerColonna(partite, "numero", "asc").map((p) => p.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it('ordina per "numero" decrescente', () => {
    const partite = [partita({ id: "a", numero: 2 }), partita({ id: "b", numero: 5 })];

    expect(ordinaIncontriPerColonna(partite, "numero", "desc").map((p) => p.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it('ordina "squadraCasa" alfabeticamente crescente al primo click', () => {
    const partite = [
      partita({ id: "zeta", squadraCasa: { nome: "Zeta", girone: "GIRONE_A" } }),
      partita({ id: "alfa", squadraCasa: { nome: "Alfa", girone: "GIRONE_A" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "squadraCasa", "asc").map((p) => p.id)).toEqual([
      "alfa",
      "zeta",
    ]);
  });

  it('un secondo click su "squadraCasa" inverte l\'ordine a decrescente', () => {
    const partite = [
      partita({ id: "alfa", squadraCasa: { nome: "Alfa", girone: "GIRONE_A" } }),
      partita({ id: "zeta", squadraCasa: { nome: "Zeta", girone: "GIRONE_A" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "squadraCasa", "desc").map((p) => p.id)).toEqual([
      "zeta",
      "alfa",
    ]);
  });

  it('ordina "squadraOspite" alfabeticamente crescente', () => {
    const partite = [
      partita({ id: "zeta", squadraOspite: { nome: "Zeta" } }),
      partita({ id: "alfa", squadraOspite: { nome: "Alfa" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "squadraOspite", "asc").map((p) => p.id)).toEqual([
      "alfa",
      "zeta",
    ]);
  });

  it('un secondo click su "squadraOspite" inverte l\'ordine a decrescente', () => {
    const partite = [
      partita({ id: "alfa", squadraOspite: { nome: "Alfa" } }),
      partita({ id: "zeta", squadraOspite: { nome: "Zeta" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "squadraOspite", "desc").map((p) => p.id)).toEqual([
      "zeta",
      "alfa",
    ]);
  });

  it('ordina "fase" crescente sullo stesso testo mostrato in cella (etichettaFasePartitaTorneo)', () => {
    const partite = [
      partita({ id: "semifinale", fase: "SEMIFINALE", tabellone: null }),
      partita({ id: "girone-a", fase: "GIRONE", squadraCasa: { nome: "X", girone: "GIRONE_A" } }),
    ];

    // "Girone A" (etichetta del girone A) viene prima di "Semifinale"
    // alfabeticamente.
    expect(ordinaIncontriPerColonna(partite, "fase", "asc").map((p) => p.id)).toEqual([
      "girone-a",
      "semifinale",
    ]);
  });

  it('un secondo click su "fase" inverte l\'ordine a decrescente', () => {
    const partite = [
      partita({ id: "girone-a", fase: "GIRONE", squadraCasa: { nome: "X", girone: "GIRONE_A" } }),
      partita({ id: "semifinale", fase: "SEMIFINALE", tabellone: null }),
    ];

    expect(ordinaIncontriPerColonna(partite, "fase", "desc").map((p) => p.id)).toEqual([
      "semifinale",
      "girone-a",
    ]);
  });

  it('ordina "risultato" crescente trattando gli incontri senza risultato come "In programma"', () => {
    const partite = [
      partita({
        id: "con-risultato",
        set1Casa: 25,
        set1Ospite: 10,
        set2Casa: 25,
        set2Ospite: 15,
      }),
      partita({ id: "senza-risultato" }),
    ];

    expect(ETICHETTA_RISULTATO_MANCANTE).toBe("In programma");
    // "2-0 (25-10, 25-15) — 3-0 punti" viene prima di "In programma"
    // alfabeticamente (cifra < lettera in localeCompare).
    expect(ordinaIncontriPerColonna(partite, "risultato", "asc").map((p) => p.id)).toEqual([
      "con-risultato",
      "senza-risultato",
    ]);
  });

  it('un secondo click su "risultato" inverte l\'ordine a decrescente', () => {
    const partite = [
      partita({ id: "senza-risultato" }),
      partita({
        id: "con-risultato",
        set1Casa: 25,
        set1Ospite: 10,
        set2Casa: 25,
        set2Ospite: 15,
      }),
    ];

    expect(ordinaIncontriPerColonna(partite, "risultato", "desc").map((p) => p.id)).toEqual([
      "senza-risultato",
      "con-risultato",
    ]);
  });

  it('click su "Quando/Dove" crescente: incontri con Slot ordinati per data/ora, quelli senza Slot in fondo', () => {
    const partite = [
      partita({ id: "senza-slot", slotTorneo: null }),
      partita({ id: "tardi", slotTorneo: { data: "2026-09-13", ora: "18:00" } }),
      partita({ id: "presto", slotTorneo: { data: "2026-09-12", ora: "10:00" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "slot", "asc").map((p) => p.id)).toEqual([
      "presto",
      "tardi",
      "senza-slot",
    ]);
  });

  it('click su "Quando/Dove" decrescente: incontri con Slot invertiti, quelli senza Slot restano comunque in fondo', () => {
    const partite = [
      partita({ id: "senza-slot", slotTorneo: null }),
      partita({ id: "tardi", slotTorneo: { data: "2026-09-13", ora: "18:00" } }),
      partita({ id: "presto", slotTorneo: { data: "2026-09-12", ora: "10:00" } }),
    ];

    expect(ordinaIncontriPerColonna(partite, "slot", "desc").map((p) => p.id)).toEqual([
      "tardi",
      "presto",
      "senza-slot",
    ]);
  });

  it("non muta l'array originale (ritorna una copia)", () => {
    const partite = [partita({ id: "b", numero: 5 }), partita({ id: "a", numero: 2 })];
    const originale = [...partite];

    ordinaIncontriPerColonna(partite, "numero", "asc");

    expect(partite).toEqual(originale);
  });

  it("restituisce un array vuoto per un input vuoto", () => {
    expect(ordinaIncontriPerColonna([], "numero", "asc")).toEqual([]);
  });
});

// Review fix (Verification Gap Reviewer, spec-20-24): la macchina a stati
// del toggle (click sulla stessa colonna -> inverte, click su un'altra ->
// resetta a crescente) era usata solo inline nell'handler di
// TabellaIncontriCategoria.tsx, mai testata direttamente - una regressione
// nel toggle non sarebbe stata rilevata da nessun test. Estratta come
// funzione pura testata qui.
describe("prossimoOrdinamento", () => {
  it("nessun ordinamento attivo -> nuova colonna, crescente", () => {
    expect(prossimoOrdinamento(null, "squadraCasa")).toEqual({
      colonna: "squadraCasa",
      direzione: "asc",
    });
  });

  it("stessa colonna gia' crescente -> diventa decrescente", () => {
    expect(
      prossimoOrdinamento({ colonna: "squadraCasa", direzione: "asc" }, "squadraCasa")
    ).toEqual({ colonna: "squadraCasa", direzione: "desc" });
  });

  it("stessa colonna gia' decrescente -> torna crescente", () => {
    expect(
      prossimoOrdinamento({ colonna: "squadraCasa", direzione: "desc" }, "squadraCasa")
    ).toEqual({ colonna: "squadraCasa", direzione: "asc" });
  });

  it("colonna diversa da quella attiva -> nuova colonna, crescente (nessuno stato terzo click)", () => {
    expect(
      prossimoOrdinamento({ colonna: "squadraCasa", direzione: "desc" }, "numero")
    ).toEqual({ colonna: "numero", direzione: "asc" });
  });
});

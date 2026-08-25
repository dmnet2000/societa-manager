import { describe, expect, it } from "vitest";
import { calcolaClassificaFinale, type PartitaTorneoConSquadre } from "./classifica-finale-torneo";

// Story 20.4 (Epic 20, Torneo Memorial): test della funzione pura, nessun
// mock necessario (nessun import "server-only" nel modulo testato).

function squadra(id: string, nome: string) {
  return { id, nome, girone: "GIRONE_A" as const, referente: null, contatto: null, categoriaTorneoId: "categoria-1", createdAt: new Date(), updatedAt: new Date() };
}

const primoA = squadra("1a", "1° Girone A");
const secondoB = squadra("2b", "2° Girone B");
const primoB = squadra("1b", "1° Girone B");
const secondoA = squadra("2a", "2° Girone A");
const terzoA = squadra("3a", "3° Girone A");
const quartoB = squadra("4b", "4° Girone B");
const terzoB = squadra("3b", "3° Girone B");
const quartoA = squadra("4a", "4° Girone A");

function partita(
  id: string,
  fase: "SEMIFINALE" | "FINALE_VINCENTI" | "FINALE_PERDENTI",
  tabellone: "POSIZIONI_1_4" | "POSIZIONI_5_8",
  squadraCasa: ReturnType<typeof squadra>,
  squadraOspite: ReturnType<typeof squadra>,
  risultato: { set1Casa: number | null; set1Ospite: number | null; set2Casa: number | null; set2Ospite: number | null; set3Casa?: number | null; set3Ospite?: number | null }
): PartitaTorneoConSquadre {
  return {
    id,
    categoriaTorneoId: "categoria-1",
    squadraCasaId: squadraCasa.id,
    squadraCasa,
    squadraOspiteId: squadraOspite.id,
    squadraOspite,
    fase,
    tabellone,
    slotTorneoId: null,
    set1Casa: risultato.set1Casa,
    set1Ospite: risultato.set1Ospite,
    set2Casa: risultato.set2Casa,
    set2Ospite: risultato.set2Ospite,
    set3Casa: risultato.set3Casa ?? null,
    set3Ospite: risultato.set3Ospite ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("calcolaClassificaFinale", () => {
  it("returns null when the tabellone is entirely incomplete (no finals yet)", () => {
    const result = calcolaClassificaFinale([]);
    expect(result).toBeNull();
  });

  it("returns null when only some of the 4 finals have a result (partially complete)", () => {
    const finaleVincenti1_4 = partita("f1", "FINALE_VINCENTI", "POSIZIONI_1_4", primoA, primoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    // FINALE_PERDENTI 1-4 esiste ma senza risultato ancora.
    const finalePerdenti1_4 = partita("f2", "FINALE_PERDENTI", "POSIZIONI_1_4", secondoB, secondoA, {
      set1Casa: null,
      set1Ospite: null,
      set2Casa: null,
      set2Ospite: null,
    });

    const result = calcolaClassificaFinale([finaleVincenti1_4, finalePerdenti1_4]);
    expect(result).toBeNull();
  });

  it("returns null when the 5-8 tabellone is missing entirely, even if 1-4 is complete", () => {
    const finaleVincenti1_4 = partita("f1", "FINALE_VINCENTI", "POSIZIONI_1_4", primoA, primoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti1_4 = partita("f2", "FINALE_PERDENTI", "POSIZIONI_1_4", secondoB, secondoA, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });

    const result = calcolaClassificaFinale([finaleVincenti1_4, finalePerdenti1_4]);
    expect(result).toBeNull();
  });

  it("returns the 8 rows in 1-8 order, deriving winners/losers with mixed outcomes (AC)", () => {
    // Tabellone 1-4: FINALE_VINCENTI -> primoA vince 2-0 (1°), primoB (2°).
    // FINALE_PERDENTI -> secondoA vince 2-1 (3°), secondoB (4°).
    const finaleVincenti1_4 = partita("f1", "FINALE_VINCENTI", "POSIZIONI_1_4", primoA, primoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti1_4 = partita(
      "f2",
      "FINALE_PERDENTI",
      "POSIZIONI_1_4",
      secondoB,
      secondoA,
      {
        set1Casa: 20,
        set1Ospite: 25,
        set2Casa: 25,
        set2Ospite: 15,
        set3Casa: 10,
        set3Ospite: 15,
      }
    );
    // Tabellone 5-8: FINALE_VINCENTI -> quartoB vince 2-0 (5°), terzoA (6°).
    // FINALE_PERDENTI -> terzoB vince 2-0 (7°), quartoA (8°).
    const finaleVincenti5_8 = partita(
      "f3",
      "FINALE_VINCENTI",
      "POSIZIONI_5_8",
      terzoA,
      quartoB,
      { set1Casa: 18, set1Ospite: 25, set2Casa: 20, set2Ospite: 25 }
    );
    const finalePerdenti5_8 = partita(
      "f4",
      "FINALE_PERDENTI",
      "POSIZIONI_5_8",
      terzoB,
      quartoA,
      { set1Casa: 25, set1Ospite: 15, set2Casa: 25, set2Ospite: 20 }
    );

    const result = calcolaClassificaFinale([
      finaleVincenti1_4,
      finalePerdenti1_4,
      finaleVincenti5_8,
      finalePerdenti5_8,
    ]);

    expect(result).toEqual([
      { posizione: 1, squadra: primoA },
      { posizione: 2, squadra: primoB },
      { posizione: 3, squadra: secondoA },
      { posizione: 4, squadra: secondoB },
      { posizione: 5, squadra: quartoB },
      { posizione: 6, squadra: terzoA },
      { posizione: 7, squadra: terzoB },
      { posizione: 8, squadra: quartoA },
    ]);
  });

  // Review fix (Verification Gap Reviewer, Story 20.4): la firma precedente
  // prendeva due array separati per tabellone (posizionali) - questo test
  // dimostra che, con la firma attuale, l'ORDINE in cui le righe compaiono
  // nell'unico array in ingresso non ha alcuna influenza sul risultato (la
  // funzione le raggruppa da sola leggendo "tabellone"/"fase" dai dati) -
  // uno scambio a monte non e' piu' possibile per costruzione.
  it("does not depend on the order of the rows in the input array (no positional swap possible)", () => {
    const finaleVincenti1_4 = partita("f1", "FINALE_VINCENTI", "POSIZIONI_1_4", primoA, primoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti1_4 = partita("f2", "FINALE_PERDENTI", "POSIZIONI_1_4", secondoB, secondoA, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finaleVincenti5_8 = partita("f3", "FINALE_VINCENTI", "POSIZIONI_5_8", terzoA, quartoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti5_8 = partita("f4", "FINALE_PERDENTI", "POSIZIONI_5_8", terzoB, quartoA, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });

    // Ordine deliberatamente "sbagliato": il tabellone 5-8 compare PRIMA
    // del tabellone 1-4 nell'array.
    const result = calcolaClassificaFinale([
      finaleVincenti5_8,
      finalePerdenti1_4,
      finalePerdenti5_8,
      finaleVincenti1_4,
    ]);

    // finalePerdenti1_4: squadraCasa=secondoB vince 2-0 (posizione 3),
    // squadraOspite=secondoA perde (posizione 4).
    expect(result).toEqual([
      { posizione: 1, squadra: primoA },
      { posizione: 2, squadra: primoB },
      { posizione: 3, squadra: secondoB },
      { posizione: 4, squadra: secondoA },
      { posizione: 5, squadra: terzoA },
      { posizione: 6, squadra: quartoB },
      { posizione: 7, squadra: terzoB },
      { posizione: 8, squadra: quartoA },
    ]);
  });

  it("ignores extra rows in the input (e.g. semifinali passed alongside finali)", () => {
    const semifinale = partita("s1", "SEMIFINALE", "POSIZIONI_1_4", primoA, secondoB, {
      set1Casa: 25,
      set1Ospite: 10,
      set2Casa: 25,
      set2Ospite: 10,
    });
    const finaleVincenti1_4 = partita("f1", "FINALE_VINCENTI", "POSIZIONI_1_4", primoA, primoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti1_4 = partita("f2", "FINALE_PERDENTI", "POSIZIONI_1_4", secondoB, secondoA, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finaleVincenti5_8 = partita("f3", "FINALE_VINCENTI", "POSIZIONI_5_8", terzoA, quartoB, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });
    const finalePerdenti5_8 = partita("f4", "FINALE_PERDENTI", "POSIZIONI_5_8", terzoB, quartoA, {
      set1Casa: 25,
      set1Ospite: 20,
      set2Casa: 25,
      set2Ospite: 18,
    });

    const result = calcolaClassificaFinale([
      semifinale,
      finaleVincenti1_4,
      finalePerdenti1_4,
      finaleVincenti5_8,
      finalePerdenti5_8,
    ]);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(8);
  });
});

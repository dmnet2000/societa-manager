import { describe, expect, it } from "vitest";
import { ordinaPartitePerSlot } from "./ordina-partite-per-slot";

type Riga = { id: string; slotTorneo: { data: string; ora: string } | null };

describe("ordinaPartitePerSlot", () => {
  it("ordina per data crescente", () => {
    const partite: Riga[] = [
      { id: "b", slotTorneo: { data: "2026-09-13", ora: "10:00" } },
      { id: "a", slotTorneo: { data: "2026-09-12", ora: "18:00" } },
    ];

    expect(ordinaPartitePerSlot(partite).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("a parità di data, ordina per ora crescente", () => {
    const partite: Riga[] = [
      { id: "b", slotTorneo: { data: "2026-09-12", ora: "18:00" } },
      { id: "a", slotTorneo: { data: "2026-09-12", ora: "15:00" } },
    ];

    expect(ordinaPartitePerSlot(partite).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("una Partita senza Slot finisce in fondo, dopo tutte quelle con Slot", () => {
    const partite: Riga[] = [
      { id: "senza-slot", slotTorneo: null },
      { id: "con-slot", slotTorneo: { data: "2026-09-13", ora: "10:00" } },
    ];

    expect(ordinaPartitePerSlot(partite).map((p) => p.id)).toEqual([
      "con-slot",
      "senza-slot",
    ]);
  });

  it("due Partite entrambe senza Slot mantengono il proprio ordine relativo originale", () => {
    const partite: Riga[] = [
      { id: "prima", slotTorneo: null },
      { id: "seconda", slotTorneo: null },
    ];

    expect(ordinaPartitePerSlot(partite).map((p) => p.id)).toEqual([
      "prima",
      "seconda",
    ]);
  });

  it("restituisce un array vuoto per un input vuoto", () => {
    expect(ordinaPartitePerSlot([])).toEqual([]);
  });

  it("non muta l'array originale (ritorna una copia)", () => {
    const partite: Riga[] = [
      { id: "b", slotTorneo: { data: "2026-09-13", ora: "10:00" } },
      { id: "a", slotTorneo: { data: "2026-09-12", ora: "18:00" } },
    ];
    const originale = [...partite];

    ordinaPartitePerSlot(partite);

    expect(partite).toEqual(originale);
  });
});

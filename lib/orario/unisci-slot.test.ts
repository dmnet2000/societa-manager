import { describe, expect, it } from "vitest";
import { unisciESordinaSlot } from "./unisci-slot";

function slot(id: string, giorno: string, oraInizio: string) {
  return { id, giorno: giorno as never, oraInizio };
}

describe("unisciESordinaSlot", () => {
  it("returns an empty array when all lists are empty", () => {
    expect(unisciESordinaSlot([], [])).toEqual([]);
  });

  it("merges multiple lists into one", () => {
    const a = [slot("1", "LUNEDI", "18:00")];
    const b = [slot("2", "MARTEDI", "19:00")];
    expect(unisciESordinaSlot(a, b).map((s) => s.id)).toEqual(["1", "2"]);
  });

  it("dedupes a Slot appearing in more than one list (same id)", () => {
    const condiviso = slot("1", "LUNEDI", "18:00");
    const risultato = unisciESordinaSlot([condiviso], [condiviso]);
    expect(risultato).toHaveLength(1);
    expect(risultato[0].id).toBe("1");
  });

  it("orders by giorno della settimana (Lunedì → Domenica), not alphabetically", () => {
    const risultato = unisciESordinaSlot([
      slot("dom", "DOMENICA", "10:00"),
      slot("lun", "LUNEDI", "10:00"),
      slot("mer", "MERCOLEDI", "10:00"),
    ]);
    expect(risultato.map((s) => s.id)).toEqual(["lun", "mer", "dom"]);
  });

  it("orders by oraInizio within the same giorno", () => {
    const risultato = unisciESordinaSlot([
      slot("tardi", "LUNEDI", "20:00"),
      slot("presto", "LUNEDI", "09:00"),
    ]);
    expect(risultato.map((s) => s.id)).toEqual(["presto", "tardi"]);
  });

  it("produces a single globally-ordered list from two independently-sorted inputs", () => {
    const ramoAllenatore = [
      slot("a1", "LUNEDI", "18:00"),
      slot("a2", "VENERDI", "18:00"),
    ];
    const ramoAtleta = [
      slot("b1", "MARTEDI", "09:00"),
      slot("b2", "VENERDI", "10:00"),
    ];
    const risultato = unisciESordinaSlot(ramoAllenatore, ramoAtleta);
    expect(risultato.map((s) => s.id)).toEqual(["a1", "b1", "b2", "a2"]);
  });
});

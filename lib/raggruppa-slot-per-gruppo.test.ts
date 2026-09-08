import { describe, expect, it } from "vitest";
import { raggruppaSlotPerGruppo } from "./raggruppa-slot-per-gruppo";

type GruppoDiTest = { id: string; nome: string };
type SlotDiTest = { id: string; gruppo: { id: string } };

function gruppo(id: string, nome: string): GruppoDiTest {
  return { id, nome };
}

function slot(id: string, gruppoId: string): SlotDiTest {
  return { id, gruppo: { id: gruppoId } };
}

describe("raggruppaSlotPerGruppo", () => {
  it("ritorna un array vuoto se non ci sono Gruppi", () => {
    expect(raggruppaSlotPerGruppo([], [], "")).toEqual([]);
  });

  it("include un Gruppo senza alcuno Slot, con array slot vuoto (mai filtrato via)", () => {
    const risultato = raggruppaSlotPerGruppo([gruppo("g1", "Under 13")], [], "");

    expect(risultato).toHaveLength(1);
    expect(risultato[0].gruppo.id).toBe("g1");
    expect(risultato[0].slot).toEqual([]);
  });

  it("partiziona correttamente gli Slot di più Gruppi mescolati nell'array in input", () => {
    const risultato = raggruppaSlotPerGruppo(
      [gruppo("g1", "Under 13"), gruppo("g2", "Under 15")],
      [slot("s1", "g1"), slot("s2", "g2"), slot("s3", "g1")],
      ""
    );

    expect(risultato).toHaveLength(2);
    const under13 = risultato.find((r) => r.gruppo.id === "g1");
    const under15 = risultato.find((r) => r.gruppo.id === "g2");
    expect(under13?.slot.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(under15?.slot.map((s) => s.id)).toEqual(["s2"]);
  });

  it("conserva l'ordine dei Gruppi in input (nessun riordino proprio - l'ordinamento è responsabilità del chiamante)", () => {
    const risultato = raggruppaSlotPerGruppo(
      [gruppo("g-under15", "Under 15"), gruppo("g-under9", "Under 9")],
      [],
      ""
    );

    expect(risultato.map((r) => r.gruppo.nome)).toEqual(["Under 15", "Under 9"]);
  });

  it("quando gruppoId è impostato, restringe il risultato al solo Gruppo corrispondente", () => {
    const risultato = raggruppaSlotPerGruppo(
      [gruppo("g1", "Under 13"), gruppo("g2", "Under 15")],
      [slot("s1", "g1"), slot("s2", "g2")],
      "g2"
    );

    expect(risultato).toHaveLength(1);
    expect(risultato[0].gruppo.id).toBe("g2");
    expect(risultato[0].slot.map((s) => s.id)).toEqual(["s2"]);
  });

  it("quando gruppoId non corrisponde a nessun Gruppo esistente (id obsoleto/cancellato), ritorna un array vuoto", () => {
    const risultato = raggruppaSlotPerGruppo(
      [gruppo("g1", "Under 13")],
      [slot("s1", "g1")],
      "g-non-esistente"
    );

    expect(risultato).toEqual([]);
  });
});

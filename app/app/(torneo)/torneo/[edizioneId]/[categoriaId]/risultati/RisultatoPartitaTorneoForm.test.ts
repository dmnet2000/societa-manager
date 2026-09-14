import { describe, expect, it, vi } from "vitest";

// RisultatoPartitaTorneoForm.tsx importa ../../../actions (Server Action),
// che a sua volta importa @/lib/torneo e altri moduli "server-only" - mock
// minimo necessario solo per poter importare il file ed estrarne la
// funzione pura sotto test, mirror esatto dello stesso mock gia' in uso in
// NuovoSlotTorneoForm.test.ts/SlotTorneoRow.test.ts. Nessun'altra chiamata
// di rete/DB avviene qui: nessuna Server Action viene mai invocata da
// questo file.
vi.mock("server-only", () => ({}));

import { slotDaNascondereNelMenu } from "./RisultatoPartitaTorneoForm";

// Story 20.30 (Epic 20, Torneo Memorial): test della sola funzione pura
// slotDaNascondereNelMenu - nessun rendering/DOM/Testing Library, mirror
// dello stile "test di logica pura" gia' in uso ovunque nel progetto per
// le funzioni pure esportate da una Client Component (calcolaRigheSelezioneGirone/
// slotNonModificabilePerCampo). Copre esattamente le righe della I/O matrix
// di spec-20-30.
describe("slotDaNascondereNelMenu", () => {
  it("hides a Slot of a previous Settimana that is already occupied by another Partita", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_1" as const };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_2", slotOccupati, null)).toBe(true);
  });

  it("does not hide the same Slot when it is still free", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_1" as const };
    const slotOccupati = new Set<string>();

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_2", slotOccupati, null)).toBe(false);
  });

  it("does not hide a Slot of the same Settimana as the Categoria, even if occupied", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_2" as const };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_2", slotOccupati, null)).toBe(false);
  });

  it("does not hide a Slot of a LATER Settimana than the Categoria, even if occupied", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_2" as const };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_1", slotOccupati, null)).toBe(false);
  });

  it("never hides a legacy Slot with settimana null, occupied or not", () => {
    const slot = { id: "slot-1", settimana: null };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_2", slotOccupati, null)).toBe(false);
    expect(
      slotDaNascondereNelMenu(slot, "SETTIMANA_2", new Set<string>(), null)
    ).toBe(false);
  });

  // I/O matrix (spec-20-30): "Slot di Settimana 1 gia' assegnato a QUESTA
  // Partita, occupato 'da se stessa'" -> resta selezionabile, mai nascosto.
  it("never hides the Slot currently assigned to THIS Partita, even if it is in slotOccupati", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_1" as const };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_2", slotOccupati, "slot-1")).toBe(false);
  });

  // Nessuna Settimana e' mai "precedente" a Settimana 1 (spec-20-30
  // Boundaries "Always") - un'ipotetica Categoria di Settimana 1 non nasconde
  // mai nulla, qualunque sia lo stato dello Slot.
  it("never hides anything for a Categoria of SETTIMANA_1 (nothing precedes it)", () => {
    const slot = { id: "slot-1", settimana: "SETTIMANA_1" as const };
    const slotOccupati = new Set(["slot-1"]);

    expect(slotDaNascondereNelMenu(slot, "SETTIMANA_1", slotOccupati, null)).toBe(false);
  });
});

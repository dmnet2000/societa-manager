import { describe, expect, it, vi } from "vitest";

// SlotTorneoRow.tsx importa ./actions (Server Action), che a sua volta
// importa @/lib/supabase/server e altri moduli "server-only" - mock minimo
// necessario solo per poter importare il file ed estrarne la funzione pura
// sotto test, mirror esatto dello stesso mock gia' in uso in
// NuovoSlotTorneoForm.test.ts. Nessun'altra chiamata di rete/DB avviene qui:
// nessuna Server Action viene mai invocata da questo file.
vi.mock("server-only", () => ({}));

import { slotNonModificabilePerCampo } from "./SlotTorneoRow";

// Story 20.25 (Epic 20, Torneo Memorial, review fix - Verification Gap
// Reviewer): test della sola funzione pura slotNonModificabilePerCampo -
// nessun rendering/DOM/Testing Library, mirror dello stile "test di logica
// pura" gia' in uso per calcolaRigheSelezioneGirone
// (NuovoSlotTorneoForm.test.ts). Copre esattamente i 3 casi rilevanti della
// condizione "fase !== GIRONE && campoId" (spec-20-25 Boundaries "Always").
describe("slotNonModificabilePerCampo", () => {
  it("returns false for a GIRONE Slot with a campoId assigned (no regression, Story 20.22 invariata)", () => {
    expect(slotNonModificabilePerCampo({ fase: "GIRONE", campoId: "campo-1" })).toBe(false);
  });

  it("returns true for a non-GIRONE Slot with a campoId assigned", () => {
    expect(slotNonModificabilePerCampo({ fase: "SEMIFINALE", campoId: "campo-1" })).toBe(true);
  });

  it("returns false for a non-GIRONE Slot with no campoId assigned", () => {
    expect(slotNonModificabilePerCampo({ fase: "SEMIFINALE", campoId: null })).toBe(false);
  });
});

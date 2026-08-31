import { describe, expect, it } from "vitest";
import { codificaSelezioneSlotGirone, decodificaSelezioneSlotGirone } from "./selezione-slot-girone";

// Story 20.18 (Epic 20, Torneo Memorial, review fix - Blind Hunter): helper
// puri di encoding/decoding condivisi tra NuovoSlotTorneoForm.tsx (client),
// actions.ts (server action) e creaSlotTorneoPerSelezione (lib/torneo.ts) -
// una sola convenzione "palestraId|campoId" testata qui, non tre copie
// indipendenti.
describe("codificaSelezioneSlotGirone", () => {
  it("joins palestraId and campoId with a pipe", () => {
    expect(codificaSelezioneSlotGirone("palestra-1", "campo-1")).toBe("palestra-1|campo-1");
  });

  it("encodes a null campoId as a trailing empty segment, never a bare id", () => {
    expect(codificaSelezioneSlotGirone("palestra-1", null)).toBe("palestra-1|");
  });
});

describe("decodificaSelezioneSlotGirone", () => {
  it("splits a value into { palestraId, campoId }", () => {
    expect(decodificaSelezioneSlotGirone("palestra-1|campo-1")).toEqual({
      palestraId: "palestra-1",
      campoId: "campo-1",
    });
  });

  it("decodes a trailing empty segment as campoId null, not an empty string", () => {
    expect(decodificaSelezioneSlotGirone("palestra-1|")).toEqual({
      palestraId: "palestra-1",
      campoId: null,
    });
  });

  // Dato manomesso/malformato (nessun separatore "|") - mai un crash, il
  // valore intero diventa il palestraId, campoId null.
  it("treats a value with no separator as a bare palestraId with a null campoId", () => {
    expect(decodificaSelezioneSlotGirone("valore-senza-separatore")).toEqual({
      palestraId: "valore-senza-separatore",
      campoId: null,
    });
  });

  it("round-trips through codificaSelezioneSlotGirone for both a Campo and no Campo", () => {
    expect(
      decodificaSelezioneSlotGirone(codificaSelezioneSlotGirone("palestra-1", "campo-1"))
    ).toEqual({ palestraId: "palestra-1", campoId: "campo-1" });
    expect(decodificaSelezioneSlotGirone(codificaSelezioneSlotGirone("palestra-1", null))).toEqual(
      { palestraId: "palestra-1", campoId: null }
    );
  });
});

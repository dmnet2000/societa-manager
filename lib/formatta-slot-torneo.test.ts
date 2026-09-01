import { describe, expect, it } from "vitest";
import { formattaSlotTestoBreve } from "./formatta-slot-torneo";

describe("formattaSlotTestoBreve", () => {
  it("formats a slot without a Campo", () => {
    const testo = formattaSlotTestoBreve({
      etichetta: "Girone A - Sabato mattina",
      data: "2026-09-05",
      ora: "10:00",
      palestra: { nome: "Palestra Saba", indirizzo: null, latitudine: null, longitudine: null },
      campo: null,
    });

    expect(testo).toBe("Girone A - Sabato mattina · 2026-09-05 10:00 · Palestra Saba");
  });

  it("appends the Campo name when present", () => {
    const testo = formattaSlotTestoBreve({
      etichetta: "Girone A - Sabato mattina",
      data: "2026-09-05",
      ora: "10:00",
      palestra: { nome: "Palestra Saba", indirizzo: null, latitudine: null, longitudine: null },
      campo: { nome: "Campo 1" },
    });

    expect(testo).toBe("Girone A - Sabato mattina · 2026-09-05 10:00 · Palestra Saba - Campo 1");
  });
});

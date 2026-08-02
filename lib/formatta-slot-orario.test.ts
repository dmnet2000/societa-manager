import { describe, expect, it } from "vitest";
import { formattaSlotOrario } from "./formatta-slot-orario";

describe("formattaSlotOrario", () => {
  it("formatta giorno abbreviato, orario e luogo", () => {
    const testo = formattaSlotOrario({
      giorno: "LUNEDI",
      oraInizio: "18:00",
      oraFine: "19:30",
      campo: { nome: "Campo 1", palestra: { nome: "Palestra Olme" } },
    });

    expect(testo).toBe("Lun 18:00-19:30 · Palestra Olme - Campo 1");
  });

  it("usa il giorno grezzo se non presente nella mappa di abbreviazione", () => {
    const testo = formattaSlotOrario({
      giorno: "ALTRO",
      oraInizio: "09:00",
      oraFine: "10:00",
      campo: { nome: "Campo 2", palestra: { nome: "Palestra Centrale" } },
    });

    expect(testo).toBe("ALTRO 09:00-10:00 · Palestra Centrale - Campo 2");
  });
});

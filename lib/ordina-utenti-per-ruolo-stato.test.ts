import { describe, expect, it } from "vitest";
import { prioritaRuoloUtente } from "./ordina-utenti-per-ruolo-stato";

describe("prioritaRuoloUtente", () => {
  it("segue l'ordine di RUOLI_VALIDI: Allenatore prima di Atleta prima di Admin", () => {
    const allenatore = prioritaRuoloUtente(["ALLENATORE"])!;
    const atleta = prioritaRuoloUtente(["ATLETA"])!;
    const admin = prioritaRuoloUtente(["ADMIN"])!;

    expect(allenatore).toBeLessThan(atleta);
    expect(atleta).toBeLessThan(admin);
  });

  it("un Utente con piu' Ruoli usa il Ruolo di indice piu' basso (piu' prioritario)", () => {
    expect(prioritaRuoloUtente(["DIRIGENTE", "ALLENATORE"])).toBe(
      prioritaRuoloUtente(["ALLENATORE"])
    );
  });

  it("un Utente senza Ruoli non ha priorita' (null, sempre in fondo)", () => {
    expect(prioritaRuoloUtente([])).toBeNull();
  });
});

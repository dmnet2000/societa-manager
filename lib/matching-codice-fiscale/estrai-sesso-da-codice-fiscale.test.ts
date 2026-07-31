import { describe, expect, it } from "vitest";
import { estraiSessoDaCodiceFiscale } from "./estrai-sesso-da-codice-fiscale";

describe("estraiSessoDaCodiceFiscale", () => {
  it("restituisce M per un giorno 01-31 (es. RSSMRA85M01H501U, giorno 01)", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M01H501U")).toBe("M");
  });

  it("restituisce M per il giorno limite 31", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M31H501U")).toBe("M");
  });

  it("restituisce F per un giorno 41-71 (+40 sul giorno, es. giorno 01 -> 41)", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M41H501U")).toBe("F");
  });

  it("restituisce F per il giorno limite 71", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M71H501U")).toBe("F");
  });

  it("restituisce null per caratteri non numerici in quella posizione (omocodia non gestita)", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85MABH501U")).toBeNull();
  });

  it("restituisce null per un giorno fuori range (00, 32-40, >71)", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M00H501U")).toBeNull();
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M35H501U")).toBeNull();
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M99H501U")).toBeNull();
  });

  it("restituisce null per una stringa troppo corta", () => {
    expect(estraiSessoDaCodiceFiscale("RSSMRA85M")).toBeNull();
  });
});

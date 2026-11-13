import { describe, expect, it } from "vitest";
import {
  CODICI_ERRORE,
  DOMINIO_TABLET,
  HEADER_VERSIONE_APP,
  emailDaNomeTablet,
  normalizzaNomeTablet,
  leggiErrore,
  leggiGare,
  leggiVersioneApp,
} from "./contratto";

describe("contratto API del tablet", () => {
  it("espone il nome dell'header e i codici dello spine", () => {
    expect(HEADER_VERSIONE_APP).toBe("X-App-Versione");
    expect([...CODICI_ERRORE]).toEqual([
      "NON_AUTENTICATO",
      "FORBIDDEN",
      "RIASSEGNATA",
      "CONFLITTO",
      "GARA_CHIUSA",
      "APP_OBSOLETA",
      "VALIDATION",
      "INTERNAL",
    ]);
  });

  describe("leggiErrore", () => {
    it("legge la forma { error: { code, message } }", () => {
      expect(leggiErrore({ error: { code: "APP_OBSOLETA", message: "m" } })).toEqual({
        code: "APP_OBSOLETA",
        message: "m",
      });
    });

    it.each([
      [undefined],
      [null],
      ["testo"],
      [[]],
      [{}],
      [{ error: "x" }],
      [{ error: { code: "SCONOSCIUTO", message: "m" } }],
      [{ error: { code: "INTERNAL" } }],
      [{ error: { code: 1, message: "m" } }],
    ])("rifiuta %j", (corpo) => {
      expect(leggiErrore(corpo)).toBeUndefined();
    });
  });

  describe("leggiGare", () => {
    const GARA = {
      garaId: "p-1",
      epoca: 2,
      numero: 7,
      categoria: "Under 14",
      casa: "Squadra A",
      ospite: "Squadra B",
      data: "2027-09-04",
      ora: "15:30",
      luogo: "Palazzetto - Campo 1",
    };

    it("legge l'elenco, anche vuoto", () => {
      expect(leggiGare({ gare: [] })).toEqual({ gare: [] });
      expect(leggiGare({ gare: [GARA] })).toEqual({ gare: [GARA] });
    });

    it("accetta una gara senza orario (data, ora e luogo null)", () => {
      const senzaSlot = { ...GARA, data: null, ora: null, luogo: null };
      expect(leggiGare({ gare: [senzaSlot] })).toEqual({ gare: [senzaSlot] });
    });

    it("accetta nomi vuoti (un dato vecchio non nasconde tutto l'elenco)", () => {
      const nomiVuoti = { ...GARA, categoria: "", casa: "", ospite: "", luogo: "" };
      expect(leggiGare({ gare: [nomiVuoti] })).toEqual({ gare: [nomiVuoti] });
    });

    it("tiene solo i campi del contratto", () => {
      expect(leggiGare({ gare: [{ ...GARA, extra: "x" }] })).toEqual({ gare: [GARA] });
    });

    it.each([[undefined], [null], [{}], [{ gare: "x" }], [{ gare: [1] }], [{ gare: [null] }]])(
      "rifiuta %j",
      (corpo) => {
        expect(leggiGare(corpo)).toBeUndefined();
      }
    );

    it.each([
      ["senza epoca", { ...GARA, epoca: undefined }],
      ["epoca 0", { ...GARA, epoca: 0 }],
      ["epoca non intera", { ...GARA, epoca: 1.5 }],
      ["epoca testo", { ...GARA, epoca: "1" }],
      ["numero mancante", { ...GARA, numero: undefined }],
      ["garaId vuoto", { ...GARA, garaId: "" }],
      ["casa non testo", { ...GARA, casa: 3 }],
      ["data assente invece di null", { ...GARA, data: undefined }],
      ["data vuota", { ...GARA, data: "" }],
      ["luogo non testo", { ...GARA, luogo: 1 }],
    ])("rifiuta tutta la risposta con una gara malformata (%s)", (_nome, gara) => {
      expect(leggiGare({ gare: [GARA, gara] })).toBeUndefined();
    });
  });

  describe("leggiVersioneApp", () => {
    it.each([
      ["1", 1],
      ["2", 2],
      [" 12 ", 12],
    ])("%j -> %d", (valore, atteso) => {
      expect(leggiVersioneApp(valore)).toBe(atteso);
    });

    it.each([[null], [undefined], [""], ["abc"], ["0"], ["-1"], ["01"], ["1.5"], ["1e3"], ["99999999999999999999"]])(
      "%j -> undefined",
      (valore) => {
        expect(leggiVersioneApp(valore)).toBeUndefined();
      }
    );
  });

  describe("nome del tablet", () => {
    it("usa il dominio riservato .invalid", () => {
      expect(DOMINIO_TABLET).toBe("tablet.invalid");
    });

    it.each([
      [" Campo1 ", "campo1"],
      ["campo1", "campo1"],
      ["CAMPO-2", "campo-2"],
      ["abc", "abc"],
      ["c1-", "c1-"],
      ["a".repeat(30), "a".repeat(30)],
    ])("%j -> %j", (valore, atteso) => {
      expect(normalizzaNomeTablet(valore)).toBe(atteso);
      expect(emailDaNomeTablet(valore)).toBe(`${atteso}@tablet.invalid`);
    });

    it.each([
      [null],
      [undefined],
      [""],
      ["   "],
      ["1campo"],
      ["-campo"],
      ["c"],
      [" c "],
      ["ca"],
      ["c1"],
      ["campo 1"],
      ["càmpo"],
      ["campo_1"],
      ["campo1@tablet.invalid"],
      ["a".repeat(31)],
    ])("%j -> undefined", (valore) => {
      expect(normalizzaNomeTablet(valore)).toBeUndefined();
      expect(emailDaNomeTablet(valore)).toBeUndefined();
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  CODICI_ERRORE,
  HEADER_VERSIONE_APP,
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
    it("legge l'elenco, anche vuoto", () => {
      expect(leggiGare({ gare: [] })).toEqual({ gare: [] });
      expect(leggiGare({ gare: [{ id: "g1" }] })).toEqual({ gare: [{ id: "g1" }] });
    });

    it.each([[undefined], [null], [{}], [{ gare: "x" }], [{ gare: [1] }], [{ gare: [null] }]])(
      "rifiuta %j",
      (corpo) => {
        expect(leggiGare(corpo)).toBeUndefined();
      }
    );
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
});

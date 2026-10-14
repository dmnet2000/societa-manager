import { describe, expect, it } from "vitest";
import {
  ordinaRigheTesseramento,
  prossimoOrdinamentoTesseramenti,
} from "./ordina-righe-tesseramento";

type Riga = {
  id: string;
  nome: string;
  codiceFiscale: string;
  iscrizioneAttiva: boolean;
  federazioniIniziali: string[];
};

function riga(id: string, nome: string, overrides: Partial<Riga> = {}): Riga {
  return {
    id,
    nome,
    codiceFiscale: `CF${id}`,
    iscrizioneAttiva: false,
    federazioniIniziali: [],
    ...overrides,
  };
}

const ids = (righe: Riga[]) => righe.map((r) => r.id);

describe("ordinaRigheTesseramento", () => {
  it("Nome: alfabetico italiano senza distinzione maiuscole/accenti", () => {
    const righe = [riga("z", "zoe"), riga("a", "Anna"), riga("e", "Èlia")];
    expect(ids(ordinaRigheTesseramento(righe, "nome", "asc"))).toEqual(["a", "e", "z"]);
    expect(ids(ordinaRigheTesseramento(righe, "nome", "desc"))).toEqual(["z", "e", "a"]);
  });

  it("Stato Iscrizione: crescente mette le Non iscritte in cima, spareggio per nome", () => {
    const righe = [
      riga("c", "Carla", { iscrizioneAttiva: true }),
      riga("b", "Bea"),
      riga("a", "Anna", { iscrizioneAttiva: true }),
      riga("d", "Dora"),
    ];
    expect(ids(ordinaRigheTesseramento(righe, "stato", "asc"))).toEqual(["b", "d", "a", "c"]);
    expect(ids(ordinaRigheTesseramento(righe, "stato", "desc"))).toEqual(["a", "c", "b", "d"]);
  });

  it("Federazione: crescente mette le non tesserate con quella federazione in cima", () => {
    const righe = [
      riga("a", "Anna", { federazioniIniziali: ["fipav"] }),
      riga("b", "Bea", { federazioniIniziali: ["csi"] }),
      riga("c", "Carla", { federazioniIniziali: ["fipav", "csi"] }),
      riga("d", "Dora"),
    ];
    expect(ids(ordinaRigheTesseramento(righe, "federazione:fipav", "asc"))).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
    expect(ids(ordinaRigheTesseramento(righe, "federazione:csi", "desc"))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("omonimi: spareggio deterministico per codice fiscale", () => {
    const righe = [
      riga("2", "Anna", { codiceFiscale: "ZZZ" }),
      riga("1", "Anna", { codiceFiscale: "AAA" }),
    ];
    expect(ids(ordinaRigheTesseramento(righe, "nome", "asc"))).toEqual(["1", "2"]);
  });

  it("non modifica l'array originale", () => {
    const righe = [riga("b", "Bea"), riga("a", "Anna")];
    ordinaRigheTesseramento(righe, "nome", "asc");
    expect(ids(righe)).toEqual(["b", "a"]);
  });
});

describe("prossimoOrdinamentoTesseramenti", () => {
  it("stessa colonna inverte la direzione, colonna nuova riparte crescente", () => {
    const attuale = { colonna: "nome" as const, direzione: "asc" as const };
    expect(prossimoOrdinamentoTesseramenti(attuale, "nome")).toEqual({
      colonna: "nome",
      direzione: "desc",
    });
    expect(
      prossimoOrdinamentoTesseramenti({ colonna: "nome", direzione: "desc" }, "federazione:x")
    ).toEqual({ colonna: "federazione:x", direzione: "asc" });
  });
});

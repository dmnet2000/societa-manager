import { describe, expect, it } from "vitest";
import { ordinaRigheIscrizione, prossimoOrdinamentoIscrizioni } from "./ordina-righe-iscrizione";

type Riga = {
  atleta: { id: string; nome: string; codiceFiscale: string };
  iscrizioneId: string | null;
  gruppi: string[];
};

function riga(
  id: string,
  nome: string,
  overrides: Partial<Omit<Riga, "atleta">> & { codiceFiscale?: string } = {}
): Riga {
  const { codiceFiscale = `CF${id}`, ...resto } = overrides;
  return { atleta: { id, nome, codiceFiscale }, iscrizioneId: null, gruppi: [], ...resto };
}

const ids = (righe: Riga[]) => righe.map((r) => r.atleta.id);

describe("ordinaRigheIscrizione", () => {
  it("Nome: alfabetico italiano senza distinzione maiuscole", () => {
    const righe = [riga("z", "zoe"), riga("a", "Anna"), riga("e", "Èlia")];
    expect(ids(ordinaRigheIscrizione(righe, "nome", "asc"))).toEqual(["a", "e", "z"]);
    expect(ids(ordinaRigheIscrizione(righe, "nome", "desc"))).toEqual(["z", "e", "a"]);
  });

  it("Gruppo: primo Gruppo, Atlete senza Gruppo sempre in fondo", () => {
    const righe = [
      riga("A", "Alfa", { gruppi: ["U16"] }),
      riga("B", "Beta", { gruppi: [] }),
      riga("C", "Gamma", { gruppi: ["U14", "U18"] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["C", "A", "B"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["A", "C", "B"]);
  });

  it("Gruppo: età a una e due cifre confrontate per valore (U8 < U10 < U14)", () => {
    const righe = [
      riga("14", "A", { gruppi: ["U14"] }),
      riga("8", "B", { gruppi: ["U8"] }),
      riga("10", "C", { gruppi: ["U10"] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["8", "10", "14"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["14", "10", "8"]);
  });

  it("Gruppo: primo Gruppo uguale, decide il secondo (lista ordinata nella funzione)", () => {
    const righe = [
      riga("a", "Anna", { gruppi: ["U18", "U14"] }),
      riga("b", "Bea", { gruppi: ["U14", "U16"] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["b", "a"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["a", "b"]);
  });

  it("Gruppo: nome vuoto o di soli spazi trattato come nessun Gruppo", () => {
    const righe = [
      riga("v", "Anna", { gruppi: [""] }),
      riga("s", "Bea", { gruppi: ["   "] }),
      riga("g", "Zoe", { gruppi: ["U14"] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["g", "v", "s"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["g", "v", "s"]);
  });

  it("Gruppo decrescente: Gruppi diversi, uguali e senza Gruppo insieme", () => {
    const righe = [
      riga("E", "Elena", { gruppi: [] }),
      riga("D", "Dora", { gruppi: ["U14"] }),
      riga("F", "Fabia", { gruppi: ["U14", "U18"] }),
      riga("C", "Carla", { gruppi: ["U18", "U14"] }),
      riga("A", "Alba", { gruppi: ["U16"] }),
      riga("B", "Bice", { gruppi: [] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["A", "C", "F", "D", "B", "E"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["D", "C", "F", "A", "B", "E"]);
  });

  it("Stato: crescente Non iscritta prima, decrescente Iscritta prima", () => {
    const righe = [riga("A", "Alfa", { iscrizioneId: "i1" }), riga("B", "Beta")];
    expect(ids(ordinaRigheIscrizione(righe, "stato", "asc"))).toEqual(["B", "A"]);
    expect(ids(ordinaRigheIscrizione(righe, "stato", "desc"))).toEqual(["A", "B"]);
  });

  it("Parità di Gruppo: ordinate per nome (anche in decrescente)", () => {
    const righe = [
      riga("m", "Marta", { gruppi: ["U14"] }),
      riga("b", "bianca", { gruppi: ["U14"] }),
      riga("x", "Anna", { gruppi: [] }),
      riga("w", "Zeta", { gruppi: [] }),
    ];
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "asc"))).toEqual(["b", "m", "x", "w"]);
    expect(ids(ordinaRigheIscrizione(righe, "gruppo", "desc"))).toEqual(["b", "m", "x", "w"]);
  });

  it("Parità di Stato: ordinate per nome", () => {
    const righe = [riga("z", "Zoe"), riga("a", "anna"), riga("i", "Ilaria", { iscrizioneId: "i" })];
    expect(ids(ordinaRigheIscrizione(righe, "stato", "asc"))).toEqual(["a", "z", "i"]);
    expect(ids(ordinaRigheIscrizione(righe, "stato", "desc"))).toEqual(["i", "a", "z"]);
  });

  it("omonimi: spareggio per codice fiscale, poi per id, indipendente dall'ordine di input", () => {
    const righe = [
      riga("id2", "Maria Rossi", { codiceFiscale: "RSSMRA10B" }),
      riga("id1", "Maria Rossi", { codiceFiscale: "RSSMRA10A" }),
      riga("id4", "Maria Rossi", { codiceFiscale: "RSSMRA10C" }),
      riga("id3", "Maria Rossi", { codiceFiscale: "RSSMRA10C" }),
    ];
    const atteso = ["id1", "id2", "id3", "id4"];
    for (const colonna of ["gruppo", "stato"] as const) {
      expect(ids(ordinaRigheIscrizione(righe, colonna, "asc"))).toEqual(atteso);
      expect(ids(ordinaRigheIscrizione([...righe].reverse(), colonna, "desc"))).toEqual(atteso);
    }
    expect(ids(ordinaRigheIscrizione(righe, "nome", "asc"))).toEqual(atteso);
    expect(ids(ordinaRigheIscrizione([...righe].reverse(), "nome", "asc"))).toEqual(atteso);
  });

  it("non modifica l'array di input", () => {
    const righe = [riga("z", "zoe"), riga("a", "Anna")];
    ordinaRigheIscrizione(righe, "nome", "asc");
    expect(ids(righe)).toEqual(["z", "a"]);
  });

  it("colonna sconosciuta: errore esplicito", () => {
    expect(() =>
      ordinaRigheIscrizione([riga("a", "A"), riga("b", "B")], "codice" as never, "asc")
    ).toThrow(/non gestita/);
  });
});

describe("prossimoOrdinamentoIscrizioni", () => {
  it("nessun ordinamento -> colonna crescente", () => {
    expect(prossimoOrdinamentoIscrizioni(null, "nome")).toEqual({ colonna: "nome", direzione: "asc" });
  });

  it("secondo clic sulla stessa colonna -> decrescente, terzo -> crescente", () => {
    expect(prossimoOrdinamentoIscrizioni({ colonna: "nome", direzione: "asc" }, "nome")).toEqual({
      colonna: "nome",
      direzione: "desc",
    });
    expect(prossimoOrdinamentoIscrizioni({ colonna: "nome", direzione: "desc" }, "nome")).toEqual({
      colonna: "nome",
      direzione: "asc",
    });
  });

  it("cambio colonna -> nuova colonna crescente", () => {
    expect(prossimoOrdinamentoIscrizioni({ colonna: "nome", direzione: "desc" }, "gruppo")).toEqual({
      colonna: "gruppo",
      direzione: "asc",
    });
  });
});

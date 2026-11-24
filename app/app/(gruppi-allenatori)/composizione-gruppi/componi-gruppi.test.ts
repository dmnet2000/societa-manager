import { describe, expect, it } from "vitest";
import { componiGruppi } from "./componi-gruppi";

const gruppo = { id: "g1", nome: "Under 14", categoria: "U14" };

describe("componiGruppi", () => {
  it("compone il Gruppo con badge e riepilogo (happy path)", () => {
    const [risultato] = componiGruppi(
      [gruppo],
      [
        { gruppoId: "g1", atletaId: "a1" },
        { gruppoId: "g1", atletaId: "a2" },
        { gruppoId: "g1", atletaId: "a3" },
      ],
      [
        { id: "a1", nome: "Bianchi Anna" },
        { id: "a2", nome: "Rossi Carla" },
        { id: "a3", nome: "Verdi Bea" },
      ],
      new Set(["a1", "a2"]),
      new Map([["a2", ["FIPAV", "CSI"]]])
    );

    expect(risultato.atlete).toHaveLength(3);
    expect(risultato.numeroIscritte).toBe(2);
    expect(risultato.numeroTesserate).toBe(1);
    expect(risultato.atlete.find((a) => a.id === "a2")).toEqual({
      id: "a2",
      nome: "Rossi Carla",
      iscritta: true,
      federazioni: ["FIPAV", "CSI"],
    });
  });

  it("ordina le Atlete per nome", () => {
    const [risultato] = componiGruppi(
      [gruppo],
      [
        { gruppoId: "g1", atletaId: "a2" },
        { gruppoId: "g1", atletaId: "a1" },
      ],
      [
        { id: "a1", nome: "Bianchi Anna" },
        { id: "a2", nome: "Rossi Carla" },
      ],
      new Set(),
      new Map()
    );

    expect(risultato.atlete.map((a) => a.nome)).toEqual(["Bianchi Anna", "Rossi Carla"]);
  });

  // Copre anche l'Iscrizione esclusa (attiva=false): elencaIscrizioniPerAnno
  // filtra gia' attiva=true, quindi l'Atleta non arriva nel Set degli iscritti.
  it("segna come non iscritta e non tesserata un'Atleta senza Iscrizione attiva ne' Tesseramento", () => {
    const [risultato] = componiGruppi(
      [gruppo],
      [{ gruppoId: "g1", atletaId: "a1" }],
      [{ id: "a1", nome: "Bianchi Anna" }],
      new Set(),
      new Map()
    );

    expect(risultato.atlete[0]).toMatchObject({ iscritta: false, federazioni: [] });
    expect(risultato.numeroIscritte).toBe(0);
    expect(risultato.numeroTesserate).toBe(0);
  });

  it("restituisce un Gruppo vuoto con conteggi a zero", () => {
    const [risultato] = componiGruppi([gruppo], [], [], new Set(), new Map());

    expect(risultato).toEqual({ ...gruppo, atlete: [], numeroIscritte: 0, numeroTesserate: 0 });
  });

  it("esclude da elenco e conteggi un'Atleta rimossa (assente da elencaAtlete)", () => {
    const [risultato] = componiGruppi(
      [gruppo],
      [
        { gruppoId: "g1", atletaId: "a1" },
        { gruppoId: "g1", atletaId: "rimossa" },
      ],
      [{ id: "a1", nome: "Bianchi Anna" }],
      new Set(["a1", "rimossa"]),
      new Map([["rimossa", ["FIPAV"]]])
    );

    expect(risultato.atlete.map((a) => a.id)).toEqual(["a1"]);
    expect(risultato.numeroIscritte).toBe(1);
    expect(risultato.numeroTesserate).toBe(0);
  });

  it("assegna ogni Atleta solo al proprio Gruppo", () => {
    const risultato = componiGruppi(
      [gruppo, { id: "g2", nome: "Under 16", categoria: "U16" }],
      [
        { gruppoId: "g1", atletaId: "a1" },
        { gruppoId: "g2", atletaId: "a2" },
      ],
      [
        { id: "a1", nome: "Bianchi Anna" },
        { id: "a2", nome: "Rossi Carla" },
      ],
      new Set(),
      new Map()
    );

    expect(risultato.map((g) => g.atlete.map((a) => a.id))).toEqual([["a1"], ["a2"]]);
  });
});

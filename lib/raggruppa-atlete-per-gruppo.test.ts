import { describe, expect, it } from "vitest";
import { raggruppaAtletePerGruppo } from "./raggruppa-atlete-per-gruppo";

type GruppoDiTest = { id: string; nome: string };
type AtletaDiTest = { id: string; nome: string };

function gruppo(id: string, nome: string): GruppoDiTest {
  return { id, nome };
}

function riga(gruppoId: string, atletaId: string): { gruppoId: string; atletaId: string } {
  return { gruppoId, atletaId };
}

describe("raggruppaAtletePerGruppo", () => {
  it("ritorna un array vuoto se non ci sono Gruppi", () => {
    expect(raggruppaAtletePerGruppo([], [], new Map())).toEqual([]);
  });

  it("include un Gruppo senza alcuna Atleta assegnata, con array atlete vuoto (mai filtrato via)", () => {
    const risultato = raggruppaAtletePerGruppo([gruppo("g1", "Under 13")], [], new Map());

    expect(risultato).toHaveLength(1);
    expect(risultato[0].gruppo.id).toBe("g1");
    expect(risultato[0].atlete).toEqual([]);
  });

  it("partiziona correttamente le Atlete di più Gruppi mescolate nell'array in input", () => {
    const atletaPerId = new Map<string, AtletaDiTest>([
      ["a1", { id: "a1", nome: "Anna" }],
      ["a2", { id: "a2", nome: "Bianca" }],
      ["a3", { id: "a3", nome: "Chiara" }],
    ]);
    const risultato = raggruppaAtletePerGruppo(
      [gruppo("g1", "Under 13"), gruppo("g2", "Under 15")],
      [riga("g1", "a1"), riga("g2", "a2"), riga("g1", "a3")],
      atletaPerId
    );

    expect(risultato).toHaveLength(2);
    const under13 = risultato.find((r) => r.gruppo.id === "g1");
    const under15 = risultato.find((r) => r.gruppo.id === "g2");
    expect(under13?.atlete.map((a) => a.id)).toEqual(["a1", "a3"]);
    expect(under15?.atlete.map((a) => a.id)).toEqual(["a2"]);
  });

  it("conserva l'ordine dei Gruppi in input (nessun riordino proprio - l'ordinamento è responsabilità del chiamante)", () => {
    const risultato = raggruppaAtletePerGruppo(
      [gruppo("g-under15", "Under 15"), gruppo("g-under9", "Under 9")],
      [],
      new Map()
    );

    expect(risultato.map((r) => r.gruppo.nome)).toEqual(["Under 15", "Under 9"]);
  });

  it("ordina le Atlete per nome, con l'id come secondo criterio deterministico per nomi duplicati", () => {
    const atletaPerId = new Map<string, AtletaDiTest>([
      ["a-z", { id: "a-z", nome: "Anna" }],
      ["a-a", { id: "a-a", nome: "Anna" }],
      ["b1", { id: "b1", nome: "Bianca" }],
    ]);
    const risultato = raggruppaAtletePerGruppo(
      [gruppo("g1", "Under 13")],
      [riga("g1", "b1"), riga("g1", "a-z"), riga("g1", "a-a")],
      atletaPerId
    );

    expect(risultato[0].atlete.map((a) => a.id)).toEqual(["a-a", "a-z", "b1"]);
  });

  it("ignora righe GruppoAtleta che puntano a un'Atleta non presente nella Map (es. filtrata a monte)", () => {
    const atletaPerId = new Map<string, AtletaDiTest>([["a1", { id: "a1", nome: "Anna" }]]);
    const risultato = raggruppaAtletePerGruppo(
      [gruppo("g1", "Under 13")],
      [riga("g1", "a1"), riga("g1", "a-non-esistente")],
      atletaPerId
    );

    expect(risultato[0].atlete.map((a) => a.id)).toEqual(["a1"]);
  });
});

import { describe, expect, it } from "vitest";
import { raggruppaSponsorPerTipo, type SponsorVetrina } from "./raggruppa-sponsor-per-tipo";

function sponsor(overrides: Partial<SponsorVetrina> = {}): SponsorVetrina {
  return {
    id: "s1",
    nome: "Sponsor",
    tipo: "BANNER",
    descrizione: "Descrizione",
    updatedAt: "2026-08-09T12:00:00.000Z",
    linkEsterno: null,
    ...overrides,
  };
}

describe("raggruppaSponsorPerTipo", () => {
  it("separa Banner e Convenzioni in due elenchi distinti (AC #1)", () => {
    const banner = sponsor({ id: "b1", tipo: "BANNER" });
    const convenzione = sponsor({ id: "c1", tipo: "CONVENZIONE" });

    const risultato = raggruppaSponsorPerTipo([banner, convenzione]);

    expect(risultato).toEqual({ banner: [banner], convenzioni: [convenzione] });
  });

  it("restituisce elenchi vuoti quando l'input è vuoto (AC #4)", () => {
    expect(raggruppaSponsorPerTipo([])).toEqual({ banner: [], convenzioni: [] });
  });

  it("preserva l'ordine relativo di ciascun elenco", () => {
    const b1 = sponsor({ id: "b1", tipo: "BANNER" });
    const c1 = sponsor({ id: "c1", tipo: "CONVENZIONE" });
    const b2 = sponsor({ id: "b2", tipo: "BANNER" });
    const c2 = sponsor({ id: "c2", tipo: "CONVENZIONE" });

    const risultato = raggruppaSponsorPerTipo([b1, c1, b2, c2]);

    expect(risultato.banner.map((s) => s.id)).toEqual(["b1", "b2"]);
    expect(risultato.convenzioni.map((s) => s.id)).toEqual(["c1", "c2"]);
  });

  it("gestisce un elenco di soli Banner (nessuna Convenzione)", () => {
    const banner = sponsor({ tipo: "BANNER" });
    expect(raggruppaSponsorPerTipo([banner])).toEqual({ banner: [banner], convenzioni: [] });
  });
});

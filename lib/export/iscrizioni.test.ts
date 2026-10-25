import { describe, expect, it } from "vitest";
import { componiExportIscrizioni, type AtletaIscrizioniExport } from "./iscrizioni";
import { giornoRomaDaIso } from "./comune";

function atleta(parziale: Partial<AtletaIscrizioniExport>): AtletaIscrizioniExport {
  return {
    id: "a1",
    nome: "Rossi Anna",
    codiceFiscale: "RSSANN",
    dataNascita: "2011-05-06T00:00:00.000Z",
    categoria: "Under 16",
    email: "anna@example.com",
    cellulare: "3331234567",
    ...parziale,
  };
}

describe("giornoRomaDaIso (Story 28.2)", () => {
  it("riporta un timestamp al giorno di calendario italiano, a mezzanotte UTC", () => {
    // 00:30 ora italiana (CEST) del 15/09 = 22:30 UTC del 14/09.
    expect(giornoRomaDaIso("2026-09-14T22:30:00.000Z")).toEqual(
      new Date("2026-09-15T00:00:00.000Z")
    );
    expect(giornoRomaDaIso("2026-09-15T10:00:00.000Z")).toEqual(
      new Date("2026-09-15T00:00:00.000Z")
    );
    expect(giornoRomaDaIso(null)).toBeNull();
    expect(giornoRomaDaIso("non-una-data")).toBeNull();
  });
});

describe("componiExportIscrizioni (Story 28.2)", () => {
  it("una riga per Atleta in ordine di nome, con Gruppi, iscrizione e contatti", () => {
    const foglio = componiExportIscrizioni(
      [
        atleta({
          id: "a2",
          nome: "Zanon Bea",
          codiceFiscale: "ZNNBEA",
          categoria: null,
          email: null,
          cellulare: null,
        }),
        atleta({}),
      ],
      [{ atletaId: "a1", confermataIl: "2026-09-14T22:30:00.000Z" }],
      new Map([["a1", ["Under 14", "Under 16"]]])
    );

    expect(foglio.nome).toBe("Iscrizioni");
    expect(foglio.intestazioni).toEqual([
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Categoria",
      "Gruppo",
      "Iscritta",
      "Data iscrizione",
      "Email",
      "Cellulare",
    ]);
    expect(foglio.righe).toEqual([
      [
        "Rossi Anna",
        "RSSANN",
        new Date("2011-05-06T00:00:00.000Z"),
        "Under 16",
        "Under 14, Under 16",
        "Sì",
        new Date("2026-09-15T00:00:00.000Z"),
        "anna@example.com",
        "3331234567",
      ],
      [
        "Zanon Bea",
        "ZNNBEA",
        new Date("2011-05-06T00:00:00.000Z"),
        null,
        "",
        "No",
        null,
        null,
        null,
      ],
    ]);
  });
});

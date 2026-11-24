import { describe, expect, it } from "vitest";
import type { ColonnaTesseramento } from "@/lib/tesseramento";
import { componiExportTesseramenti } from "./tesseramenti";

const COLONNE: ColonnaTesseramento[] = [
  { id: "f-fipav", etichetta: "FIPAV", nome: "Federazione Italiana Pallavolo", attiva: true },
  { id: "f-csi", etichetta: "CSI", nome: "Centro Sportivo Italiano", attiva: true },
  { id: "f-uisp", etichetta: "UISP", nome: "UISP", attiva: false },
];

describe("componiExportTesseramenti (Story 28.3)", () => {
  it("una colonna per Federazione, nell'ordine e con le etichette della pagina", () => {
    const foglio = componiExportTesseramenti(
      [
        {
          id: "a2",
          nome: "Zanon Bea",
          codiceFiscale: "ZNNBEA",
          dataNascita: "2012-03-04T00:00:00.000Z",
        },
        {
          id: "a1",
          nome: "Rossi Anna",
          codiceFiscale: "RSSANN",
          dataNascita: "2011-05-06T00:00:00.000Z",
        },
      ],
      new Set(["a1"]),
      new Map([["a1", ["f-uisp", "f-fipav"]]]),
      COLONNE,
      new Map([["a1", ["Under 16"]]])
    );

    expect(foglio.nome).toBe("Tesseramenti");
    expect(foglio.intestazioni).toEqual([
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Gruppo",
      "Iscritta",
      "Tesserata",
      "FIPAV",
      "CSI",
      "UISP",
    ]);
    expect(foglio.righe).toEqual([
      [
        "Rossi Anna",
        "RSSANN",
        new Date("2011-05-06T00:00:00.000Z"),
        "Under 16",
        "Sì",
        "Sì",
        "Sì",
        null,
        "Sì",
      ],
      [
        "Zanon Bea",
        "ZNNBEA",
        new Date("2012-03-04T00:00:00.000Z"),
        "",
        "No",
        "No",
        null,
        null,
        null,
      ],
    ]);
  });

  it("ignora un id senza colonna, come la pagina", () => {
    const foglio = componiExportTesseramenti(
      [{ id: "a1", nome: "Rossi Anna", codiceFiscale: "RSSANN", dataNascita: null }],
      new Set(),
      new Map([["a1", ["f-inesistente"]]]),
      COLONNE,
      new Map()
    );

    expect(foglio.righe[0].slice(5)).toEqual(["No", null, null, null]);
  });

  it("senza Federazioni restano solo le colonne fisse", () => {
    const foglio = componiExportTesseramenti([], new Set(), new Map(), [], new Map());

    expect(foglio.intestazioni).toHaveLength(6);
    expect(foglio.righe).toEqual([]);
  });
});

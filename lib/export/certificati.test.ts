import { describe, expect, it } from "vitest";
import {
  componiExportCertificati,
  statoCertificatoExport,
  type CertificatoExport,
} from "./certificati";

const OGGI = new Date("2026-10-25T10:00:00.000Z");

function certificato(parziale: Partial<CertificatoExport>): CertificatoExport {
  return {
    atletaId: "a1",
    stato: "CONFERMATO",
    filePath: "a1/file.pdf",
    dataInizioValidita: "2026-01-10T00:00:00.000Z",
    dataFineValidita: "2027-01-10T00:00:00.000Z",
    mesiValidita: 12,
    ...parziale,
  };
}

describe("statoCertificatoExport (Story 28.1)", () => {
  it("usa le stesse etichette della pagina", () => {
    expect(statoCertificatoExport(undefined, OGGI)).toBe("Senza certificato");
    expect(statoCertificatoExport(certificato({ stato: "IN_ATTESA" }), OGGI)).toBe(
      "Da confermare"
    );
    expect(statoCertificatoExport(certificato({}), OGGI)).toBe("In regola");
    expect(
      statoCertificatoExport(
        certificato({ dataFineValidita: "2026-11-10T00:00:00.000Z" }),
        OGGI
      )
    ).toBe("In scadenza");
    expect(
      statoCertificatoExport(
        certificato({ dataFineValidita: "2026-10-01T00:00:00.000Z" }),
        OGGI
      )
    ).toBe("Scaduto");
    expect(statoCertificatoExport(certificato({ dataFineValidita: null }), OGGI)).toBe(
      "Senza certificato"
    );
  });
});

describe("componiExportCertificati (Story 28.1)", () => {
  it("una riga per Atleta in ordine di nome, con Gruppi, stato, date e file", () => {
    const foglio = componiExportCertificati(
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
      [certificato({ atletaId: "a1" })],
      new Map([["a1", ["Under 14", "Under 16"]]]),
      OGGI
    );

    expect(foglio.nome).toBe("Certificati");
    expect(foglio.intestazioni).toEqual([
      "Atleta",
      "Codice fiscale",
      "Data di nascita",
      "Gruppo",
      "Stato",
      "Inizio validità",
      "Fine validità",
      "Mesi di validità",
      "File caricato",
    ]);
    expect(foglio.righe).toEqual([
      [
        "Rossi Anna",
        "RSSANN",
        new Date("2011-05-06T00:00:00.000Z"),
        "Under 14, Under 16",
        "In regola",
        new Date("2026-01-10T00:00:00.000Z"),
        new Date("2027-01-10T00:00:00.000Z"),
        12,
        "Sì",
      ],
      [
        "Zanon Bea",
        "ZNNBEA",
        new Date("2012-03-04T00:00:00.000Z"),
        "",
        "Senza certificato",
        null,
        null,
        null,
        "No",
      ],
    ]);
  });
});

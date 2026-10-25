import { describe, expect, it } from "vitest";
import type { ColonnaTesseramento } from "@/lib/tesseramento";
import type { AtletaAnagraficaExport } from "@/lib/db-rls/atleta";
import { componiExportCompleto, type DatiExportCompleto } from "./completo";
import { componiExportCertificati, type CertificatoExport } from "./certificati";
import { componiExportIscrizioni } from "./iscrizioni";
import { componiExportTesseramenti } from "./tesseramenti";

const OGGI = new Date("2026-10-25T10:00:00.000Z");

function atleta(parziale: Partial<AtletaAnagraficaExport>): AtletaAnagraficaExport {
  return {
    id: "a1",
    nome: "Rossi Anna",
    codiceFiscale: "RSSANN",
    sesso: "F",
    dataNascita: "2011-05-06T00:00:00.000Z",
    luogoNascita: "Treviso",
    provinciaNascita: "TV",
    indirizzo: "Via Roma 1",
    cap: "31100",
    localitaResidenza: "Treviso",
    provinciaResidenza: "TV",
    email: "anna@example.com",
    cellulare: "3331234567",
    categoria: "Under 16",
    matricola: "123456",
    ...parziale,
  };
}

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

const COLONNE: ColonnaTesseramento[] = [
  { id: "f-fipav", etichetta: "FIPAV", nome: "Federazione Italiana Pallavolo", attiva: true },
  { id: "f-csi", etichetta: "CSI", nome: "Centro Sportivo Italiano", attiva: true },
];

const DATI: DatiExportCompleto = {
  atlete: [
    atleta({ id: "a3", nome: "Verdi Carla", codiceFiscale: "VRDCRL" }),
    atleta({
      id: "a2",
      nome: "Zanon Bea",
      codiceFiscale: "ZNNBEA",
      sesso: "F",
      luogoNascita: null,
      provinciaNascita: null,
      indirizzo: null,
      cap: null,
      localitaResidenza: null,
      provinciaResidenza: null,
      email: null,
      cellulare: null,
      categoria: null,
      matricola: null,
    }),
    atleta({}),
  ],
  certificati: [
    certificato({}),
    certificato({ atletaId: "a3", stato: "IN_ATTESA" }),
  ],
  iscrizioni: [{ atletaId: "a1", confermataIl: "2026-09-14T22:30:00.000Z" }],
  tesseramenti: new Map([
    ["a1", ["f-csi", "f-fipav"]],
    ["a3", ["f-csi"]],
  ]),
  colonneFederazioni: COLONNE,
  gruppiPerAtleta: new Map([["a1", ["Under 14", "Under 16"]]]),
};

describe("componiExportCompleto (Story 28.4)", () => {
  it("una riga per Atleta in ordine di nome, con anagrafica e stato della stagione", () => {
    const foglio = componiExportCompleto(DATI, OGGI);

    expect(foglio.intestazioni).toEqual([
      "Atleta",
      "Codice fiscale",
      "Sesso",
      "Data di nascita",
      "Luogo di nascita",
      "Provincia di nascita",
      "Indirizzo",
      "CAP",
      "Località",
      "Provincia",
      "Email",
      "Cellulare",
      "Categoria",
      "Matricola",
      "Gruppo",
      "Stato certificato",
      "Fine validità certificato",
      "Iscritta",
      "Data iscrizione",
      "Tesserata",
      "Federazioni",
    ]);
    expect(foglio.righe.map((riga) => riga[0])).toEqual([
      "Rossi Anna",
      "Verdi Carla",
      "Zanon Bea",
    ]);
    expect(foglio.righe[0]).toEqual([
      "Rossi Anna",
      "RSSANN",
      "F",
      new Date("2011-05-06T00:00:00.000Z"),
      "Treviso",
      "TV",
      "Via Roma 1",
      "31100",
      "Treviso",
      "TV",
      "anna@example.com",
      "3331234567",
      "Under 16",
      "123456",
      "Under 14, Under 16",
      "In regola",
      new Date("2027-01-10T00:00:00.000Z"),
      "Sì",
      new Date("2026-09-15T00:00:00.000Z"),
      "Sì",
      // Ordine delle colonne Federazione, non dell'array salvato.
      "FIPAV, CSI",
    ]);
    expect(foglio.righe[2].slice(14)).toEqual([
      "",
      "Senza certificato",
      null,
      "No",
      null,
      "No",
      "",
    ]);
  });

  it("stato certificato, iscrizione e tesseramento coincidono con gli export di sezione", () => {
    const completo = componiExportCompleto(DATI, OGGI);
    const certificati = componiExportCertificati(
      DATI.atlete,
      DATI.certificati,
      DATI.gruppiPerAtleta,
      OGGI
    );
    const iscrizioni = componiExportIscrizioni(
      DATI.atlete,
      DATI.iscrizioni,
      DATI.gruppiPerAtleta
    );
    const tesseramenti = componiExportTesseramenti(
      DATI.atlete,
      new Set(DATI.iscrizioni.map((i) => i.atletaId)),
      DATI.tesseramenti,
      DATI.colonneFederazioni,
      DATI.gruppiPerAtleta
    );

    const colonna = (foglio: { intestazioni: string[]; righe: unknown[][] }, nome: string) =>
      foglio.righe.map((riga) => riga[foglio.intestazioni.indexOf(nome)]);

    expect(colonna(completo, "Stato certificato")).toEqual(colonna(certificati, "Stato"));
    expect(colonna(completo, "Fine validità certificato")).toEqual(
      colonna(certificati, "Fine validità")
    );
    expect(colonna(completo, "Iscritta")).toEqual(colonna(iscrizioni, "Iscritta"));
    expect(colonna(completo, "Data iscrizione")).toEqual(
      colonna(iscrizioni, "Data iscrizione")
    );
    expect(colonna(completo, "Tesserata")).toEqual(colonna(tesseramenti, "Tesserata"));
    expect(colonna(completo, "Gruppo")).toEqual(colonna(certificati, "Gruppo"));
  });
});

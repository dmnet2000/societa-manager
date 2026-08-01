import { describe, expect, it } from "vitest";
import { calcolaAtleteConCertificatoInScadenza } from "./certificato-in-scadenza-per-atleta";

describe("calcolaAtleteConCertificatoInScadenza", () => {
  const oggi = new Date("2026-07-22T10:00:00Z");
  const atlete = [
    { id: "a1", nome: "Anna" },
    { id: "a2", nome: "Bea" },
    { id: "a3", nome: "Carla" },
  ];

  it("segna certificatoInScadenza=true solo per un certificato CONFERMATO entro 30 giorni", () => {
    const certificati = [
      { atletaId: "a1", dataFineValidita: "2026-08-06T00:00:00.000Z", stato: "CONFERMATO" },
    ];
    const risultato = calcolaAtleteConCertificatoInScadenza(atlete, certificati, oggi);
    expect(risultato.find((a) => a.id === "a1")?.certificatoInScadenza).toBe(true);
  });

  it("non segna certificatoInScadenza per un certificato IN_ATTESA anche se la data rientra nei 30 giorni", () => {
    const certificati = [
      { atletaId: "a1", dataFineValidita: "2026-08-06T00:00:00.000Z", stato: "IN_ATTESA" },
    ];
    const risultato = calcolaAtleteConCertificatoInScadenza(atlete, certificati, oggi);
    expect(risultato.find((a) => a.id === "a1")?.certificatoInScadenza).toBe(false);
  });

  it("non segna certificatoInScadenza per un certificato scaduto", () => {
    const certificati = [
      { atletaId: "a1", dataFineValidita: "2026-07-21T00:00:00.000Z", stato: "CONFERMATO" },
    ];
    const risultato = calcolaAtleteConCertificatoInScadenza(atlete, certificati, oggi);
    expect(risultato.find((a) => a.id === "a1")?.certificatoInScadenza).toBe(false);
  });

  it("non segna certificatoInScadenza per un'Atleta senza certificato", () => {
    const risultato = calcolaAtleteConCertificatoInScadenza(atlete, [], oggi);
    expect(risultato.every((a) => a.certificatoInScadenza === false)).toBe(true);
  });

  it("preserva id/nome e l'ordine dell'elenco Atlete in ingresso", () => {
    const risultato = calcolaAtleteConCertificatoInScadenza(atlete, [], oggi);
    expect(risultato.map((a) => ({ id: a.id, nome: a.nome }))).toEqual(atlete);
  });
});

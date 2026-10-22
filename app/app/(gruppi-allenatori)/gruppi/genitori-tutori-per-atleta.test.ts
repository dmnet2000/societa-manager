import { describe, expect, it } from "vitest";
import { costruisciGenitoriTutoriPerAtleta } from "./genitori-tutori-per-atleta";

const OGGI = new Date("2026-10-20T10:00:00.000Z");

const riga = (atletaId: string, posizione: 1 | 2, override: Record<string, unknown> = {}) => ({
  id: `t-${atletaId}-${posizione}`,
  atletaId,
  posizione,
  nome: `TUTORE ${posizione}`,
  codiceFiscale: "RSSMRA70A01H501U",
  luogoNascita: null,
  dataNascita: "1970-01-01T00:00:00+00:00",
  indirizzo: null,
  cap: null,
  localitaResidenza: null,
  provinciaResidenza: null,
  email: null,
  telefono: null,
  intestatarioRicevuta: false,
  utenteId: null,
  ...override,
});

const atlete = [
  { id: "minorenne", dataNascita: "2014-03-01T00:00:00.000Z" },
  { id: "maggiorenne-con-tutori", dataNascita: "2000-01-01T00:00:00.000Z" },
  { id: "maggiorenne-senza-tutori", dataNascita: "1995-05-05T00:00:00.000Z" },
  { id: "altra-minorenne", dataNascita: "2012-06-10T00:00:00.000Z" },
];

describe("costruisciGenitoriTutoriPerAtleta", () => {
  const risultato = costruisciGenitoriTutoriPerAtleta(
    atlete,
    [
      riga("minorenne", 1, { intestatarioRicevuta: true }),
      riga("minorenne", 2, { dataNascita: null }),
      riga("maggiorenne-con-tutori", 1),
      riga("altra-minorenne", 1, { nome: "ALTRO" }),
    ],
    [
      { atletaId: "minorenne", utenteId: "u1", utente: { email: "a@example.com" } },
      { atletaId: "altra-minorenne", utenteId: "u2", utente: { email: "b@example.com" } },
    ],
    OGGI
  );

  it("una minorenne ha il form completo con i propri tutori e genitori collegati", () => {
    const dati = risultato.get("minorenne");
    expect(dati?.soloRimozione).toBe(false);
    expect(dati?.tutori.map((t) => t.posizione)).toEqual([1, 2]);
    expect(dati?.tutori[0].intestatarioRicevuta).toBe(true);
    expect(dati?.genitoriCollegati).toEqual([{ utenteId: "u1", email: "a@example.com" }]);
  });

  it("tronca dataNascita a yyyy-mm-dd e non passa id/atletaId al client", () => {
    const [t1, t2] = risultato.get("minorenne")!.tutori;
    expect(t1.dataNascita).toBe("1970-01-01");
    expect(t2.dataNascita).toBeNull();
    expect(t1).not.toHaveProperty("id");
    expect(t1).not.toHaveProperty("atletaId");
  });

  it("una maggiorenne con tutori salvati ha una voce in sola rimozione", () => {
    const dati = risultato.get("maggiorenne-con-tutori");
    expect(dati?.soloRimozione).toBe(true);
    expect(dati?.tutori).toHaveLength(1);
    expect(dati?.genitoriCollegati).toEqual([]);
  });

  it("una maggiorenne senza tutori non ha alcuna voce (nessun pulsante)", () => {
    expect(risultato.has("maggiorenne-senza-tutori")).toBe(false);
  });

  it("non mescola righe di Atlete diverse", () => {
    const dati = risultato.get("altra-minorenne");
    expect(dati?.tutori.map((t) => t.nome)).toEqual(["ALTRO"]);
    expect(dati?.genitoriCollegati).toEqual([{ utenteId: "u2", email: "b@example.com" }]);
  });

  it("una minorenne senza tutori ha comunque il form (vuoto)", () => {
    const solo = costruisciGenitoriTutoriPerAtleta(
      [{ id: "x", dataNascita: "2015-01-01T00:00:00.000Z" }],
      [],
      [],
      OGGI
    );
    expect(solo.get("x")).toEqual({ tutori: [], genitoriCollegati: [], soloRimozione: false });
  });
});

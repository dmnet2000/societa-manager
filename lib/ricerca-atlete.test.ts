import { describe, expect, it } from "vitest";
import { corrispondeRicercaAtleta } from "./ricerca-atlete";

const atleta = { nome: "Rossi Maria", codiceFiscale: "RSSMRA10A41F205X" };

describe("corrispondeRicercaAtleta", () => {
  it("una ricerca vuota o di soli spazi non filtra nulla", () => {
    expect(corrispondeRicercaAtleta(atleta, "")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "   ")).toBe(true);
  });

  it("trova per cognome, per nome e per parte del codice fiscale", () => {
    expect(corrispondeRicercaAtleta(atleta, "ross")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "mari")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "RSSMRA10")).toBe(true);
  });

  it("ignora maiuscole/minuscole", () => {
    expect(corrispondeRicercaAtleta(atleta, "ROSSI")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "rssmra10a41f205x")).toBe(true);
  });

  it("ignora accenti e diacritici", () => {
    expect(corrispondeRicercaAtleta({ nome: "Nicolò Bianchi", codiceFiscale: "X" }, "nicolo")).toBe(
      true
    );
    expect(corrispondeRicercaAtleta({ nome: "Nicolo Bianchi", codiceFiscale: "X" }, "nicolò")).toBe(
      true
    );
  });

  it("piu' parole devono comparire tutte, in qualunque ordine", () => {
    expect(corrispondeRicercaAtleta(atleta, "maria rossi")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "rossi maria")).toBe(true);
    expect(corrispondeRicercaAtleta(atleta, "rossi luca")).toBe(false);
  });

  it("non trova un'Atleta che non corrisponde", () => {
    expect(corrispondeRicercaAtleta(atleta, "bianchi")).toBe(false);
    expect(corrispondeRicercaAtleta(atleta, "ZZZ")).toBe(false);
  });
});

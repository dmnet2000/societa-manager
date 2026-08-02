import { describe, expect, it } from "vitest";
import { ordinaPerPrioritaStato } from "./ordina-certificati-per-stato";

type Riga = { stato: "SCADUTO" | "IN_SCADENZA" | "IN_REGOLA" | "SENZA_CERTIFICATO"; nome: string };

describe("ordinaPerPrioritaStato", () => {
  it("ordina per priorita': Scaduto, poi In scadenza, poi In regola", () => {
    const righe: Riga[] = [
      { stato: "IN_REGOLA", nome: "Anna" },
      { stato: "SCADUTO", nome: "Bruna" },
      { stato: "IN_SCADENZA", nome: "Carla" },
    ];

    const ordinate = ordinaPerPrioritaStato(righe);

    expect(ordinate.map((r) => r.nome)).toEqual(["Bruna", "Carla", "Anna"]);
  });

  it("a parita' di stato, ordina alfabeticamente per nome", () => {
    const righe: Riga[] = [
      { stato: "SCADUTO", nome: "Zeta" },
      { stato: "SCADUTO", nome: "Alfa" },
      { stato: "SCADUTO", nome: "Mario" },
    ];

    const ordinate = ordinaPerPrioritaStato(righe);

    expect(ordinate.map((r) => r.nome)).toEqual(["Alfa", "Mario", "Zeta"]);
  });

  it("gestisce correttamente accenti/maiuscole tramite localeCompare('it')", () => {
    const righe: Riga[] = [
      { stato: "IN_REGOLA", nome: "élena" },
      { stato: "IN_REGOLA", nome: "Anna" },
    ];

    const ordinate = ordinaPerPrioritaStato(righe);

    expect(ordinate.map((r) => r.nome)).toEqual(["Anna", "élena"]);
  });

  it("restituisce un array vuoto per un input vuoto", () => {
    expect(ordinaPerPrioritaStato([])).toEqual([]);
  });

  it("non modifica un array gia' ordinato", () => {
    const righe: Riga[] = [
      { stato: "SCADUTO", nome: "Anna" },
      { stato: "IN_SCADENZA", nome: "Bruna" },
      { stato: "IN_REGOLA", nome: "Carla" },
    ];

    const ordinate = ordinaPerPrioritaStato(righe);

    expect(ordinate.map((r) => r.nome)).toEqual(["Anna", "Bruna", "Carla"]);
  });

  it("non muta l'array originale (ritorna una copia)", () => {
    const righe: Riga[] = [
      { stato: "IN_REGOLA", nome: "Zeta" },
      { stato: "SCADUTO", nome: "Alfa" },
    ];
    const originale = [...righe];

    ordinaPerPrioritaStato(righe);

    expect(righe).toEqual(originale);
  });

  it("include SENZA_CERTIFICATO per ultimo se presente", () => {
    const righe: Riga[] = [
      { stato: "SENZA_CERTIFICATO", nome: "Anna" },
      { stato: "IN_REGOLA", nome: "Bruna" },
      { stato: "SCADUTO", nome: "Carla" },
    ];

    const ordinate = ordinaPerPrioritaStato(righe);

    expect(ordinate.map((r) => r.nome)).toEqual(["Carla", "Bruna", "Anna"]);
  });
});

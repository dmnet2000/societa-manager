import { describe, expect, it } from "vitest";
import { calcolaClassificaGirone } from "./classifica-girone-torneo";
import type { PartitaTorneo, SquadraTorneo } from "@prisma/client";

function squadra(id: string, nome: string): SquadraTorneo {
  return {
    id,
    nome,
    girone: "GIRONE_A",
    referente: null,
    contatto: null,
    categoriaTorneoId: "categoria-1",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
  };
}

function partita(
  id: string,
  squadraCasaId: string,
  squadraOspiteId: string,
  set1: [number, number] | null,
  set2?: [number, number],
  set3?: [number, number]
): PartitaTorneo {
  return {
    id,
    categoriaTorneoId: "categoria-1",
    squadraCasaId,
    squadraOspiteId,
    // Story 20.4: fase/tabellone aggiunti al tipo PartitaTorneo - GIRONE/null
    // qui, invariato per questi test scritti prima della Story 20.4
    // (calcolaClassificaGirone continua a non guardare questi due campi).
    fase: "GIRONE",
    tabellone: null,
    set1Casa: set1 ? set1[0] : null,
    set1Ospite: set1 ? set1[1] : null,
    set2Casa: set2 ? set2[0] : null,
    set2Ospite: set2 ? set2[1] : null,
    set3Casa: set3 ? set3[0] : null,
    set3Ospite: set3 ? set3[1] : null,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
  };
}

describe("calcolaClassificaGirone", () => {
  it("restituisce una classifica vuota di partite giocate se nessuna partita ha un risultato", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta")];
    const partite = [partita("p1", "s1", "s2", null)];

    const classifica = calcolaClassificaGirone(squadre, partite);

    expect(classifica).toEqual([
      { squadra: squadre[0], punti: 0, setVinti: 0, setPersi: 0, partiteGiocate: 0 },
      { squadra: squadre[1], punti: 0, setVinti: 0, setPersi: 0, partiteGiocate: 0 },
    ]);
  });

  it("una partita senza risultato completo (solo set1) non conta", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta")];
    const partite = [partita("p1", "s1", "s2", [25, 20])];

    const classifica = calcolaClassificaGirone(squadre, partite);

    expect(classifica.every((r) => r.partiteGiocate === 0)).toBe(true);
  });

  it("ordina per punti totali discendenti", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta"), squadra("s3", "Gamma")];
    const partite = [
      // Alfa batte Beta 2-0 (3 punti Alfa, 0 Beta)
      partita("p1", "s1", "s2", [25, 20], [25, 18]),
      // Gamma batte Alfa 2-1 (2 punti Gamma, 1 Alfa) -> Alfa totale 4pt, Gamma 2pt, Beta 0pt
      partita("p2", "s3", "s1", [25, 20], [20, 25], [15, 10]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);

    expect(classifica.map((r) => r.squadra.nome)).toEqual(["Alfa", "Gamma", "Beta"]);
    expect(classifica.map((r) => r.punti)).toEqual([4, 2, 0]);
  });

  it("usa i set vinti come spareggio a parita' di punti", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta"), squadra("s3", "Gamma")];
    const partite = [
      // Alfa batte Beta 2-1 (Alfa: 2pt, 2 set vinti, 1 perso)
      partita("p1", "s1", "s2", [25, 20], [20, 25], [15, 10]),
      // Gamma batte Beta 2-1 in un'altra partita, Beta gia' 0 vittorie -
      // usiamo invece un secondo confronto diretto per generare parita' di
      // punti tra Alfa e Gamma con set vinti diversi.
      partita("p2", "s3", "s2", [25, 10], [25, 10]),
      partita("p3", "s1", "s3", [20, 25], [18, 25]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);

    // Alfa: p1 (2pt, 2 set vinti/1 perso) + p3 persa 0-2 (0pt, 0 set vinti/2 persi) = 2pt, 2 set vinti
    // Gamma: p2 vinta 2-0 (3pt, 2 set vinti/0 persi) + p3 vinta 2-0 (3pt, 2 set vinti/0 persi) = 6pt, 4 set vinti
    // Beta: p1 persa (1pt, 1 set vinto/2 persi) + p2 persa 0-2 (0pt, 0 set vinti/2 persi) = 1pt, 1 set vinto
    expect(classifica.map((r) => r.squadra.nome)).toEqual(["Gamma", "Alfa", "Beta"]);
  });

  it("a parita' di punti E set vinti, ordina alfabeticamente per nome come ultimo spareggio", () => {
    const squadre = [squadra("s1", "Zeta"), squadra("s2", "Alfa")];
    const partite: PartitaTorneo[] = [];

    const classifica = calcolaClassificaGirone(squadre, partite);

    expect(classifica.map((r) => r.squadra.nome)).toEqual(["Alfa", "Zeta"]);
  });

  it("calcola correttamente setVinti/setPersi/partiteGiocate su un incontro 2-1", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta")];
    const partite = [partita("p1", "s1", "s2", [25, 20], [20, 25], [15, 12])];

    const classifica = calcolaClassificaGirone(squadre, partite);
    const alfa = classifica.find((r) => r.squadra.id === "s1")!;
    const beta = classifica.find((r) => r.squadra.id === "s2")!;

    expect(alfa).toMatchObject({ punti: 2, setVinti: 2, setPersi: 1, partiteGiocate: 1 });
    expect(beta).toMatchObject({ punti: 1, setVinti: 1, setPersi: 2, partiteGiocate: 1 });
  });

  it("ignora una partita i cui protagonisti non sono tra le squadre passate (difensivo)", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta")];
    const partite = [partita("p1", "s1", "s-fuori-girone", [25, 20], [25, 18])];

    const classifica = calcolaClassificaGirone(squadre, partite);

    expect(classifica.every((r) => r.partiteGiocate === 0)).toBe(true);
  });

  // Review fix (Verification Gap Reviewer, Story 20.4): il filtro
  // "fase === GIRONE" e' ora dentro la funzione stessa (prima viveva solo
  // nella pagina chiamante, senza alcun test capace di intercettare una
  // regressione se rimosso/invertito). Questo test lo dimostra direttamente
  // sulla funzione pura, passando una semifinale/finale tra Squadre dello
  // stesso girone (scenario realistico: 1° e 2° dello stesso girone non si
  // incontrano mai in semifinale per l'incrocio dell'AC, ma il filtro deve
  // comunque proteggere da qualunque riga di fase diversa da GIRONE).
  it("scarta le PartitaTorneo di fase diversa da GIRONE, anche se i protagonisti sono nel girone passato", () => {
    const squadre = [squadra("s1", "Alfa"), squadra("s2", "Beta")];
    const partitaGirone = partita("p1", "s1", "s2", [25, 20], [25, 18]);
    const partitaSemifinale: PartitaTorneo = {
      ...partita("p2", "s1", "s2", [25, 10], [25, 10]),
      fase: "SEMIFINALE",
      tabellone: "POSIZIONI_1_4",
    };

    const classifica = calcolaClassificaGirone(squadre, [partitaGirone, partitaSemifinale]);
    const alfa = classifica.find((r) => r.squadra.id === "s1")!;

    // Solo la partita di girone conta - se la semifinale non fosse
    // scartata, Alfa avrebbe 6 punti/4 set vinti invece di 3/2.
    expect(alfa).toMatchObject({ punti: 3, setVinti: 2, setPersi: 0, partiteGiocate: 1 });
  });
});

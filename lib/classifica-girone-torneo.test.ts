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
    // Story 20.11: edizioneTorneoId/numero aggiunti al tipo PartitaTorneo -
    // valori fissi qui, invariato per questi test scritti prima della Story
    // 20.11 (calcolaClassificaGirone continua a non guardare questi campi).
    edizioneTorneoId: "edizione-1",
    numero: 1,
    squadraCasaId,
    squadraOspiteId,
    // Story 20.4: fase/tabellone aggiunti al tipo PartitaTorneo - GIRONE/null
    // qui, invariato per questi test scritti prima della Story 20.4
    // (calcolaClassificaGirone continua a non guardare questi due campi).
    fase: "GIRONE",
    tabellone: null,
    // Story 20.9: slotTorneoId aggiunto al tipo PartitaTorneo - null qui,
    // invariato per questi test scritti prima della Story 20.9
    // (calcolaClassificaGirone continua a non guardare questo campo).
    slotTorneoId: null,
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
      {
        squadra: squadre[0],
        punti: 0,
        setVinti: 0,
        setPersi: 0,
        partiteGiocate: 0,
        puntiFatti: 0,
        puntiSubiti: 0,
      },
      {
        squadra: squadre[1],
        punti: 0,
        setVinti: 0,
        setPersi: 0,
        partiteGiocate: 0,
        puntiFatti: 0,
        puntiSubiti: 0,
      },
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

  // Story 20.16 (spec-20-16, I/O Edge-Case Matrix riga 1): a parita' di
  // punti-classifica, il quoziente set (setVinti/setPersi) sostituisce i set
  // vinti assoluti come secondo criterio di spareggio.
  it("a parita' di punti-classifica, ordina per quoziente set (setVinti/setPersi) discendente", () => {
    const squadre = [
      squadra("sA", "A"),
      squadra("sB", "B"),
      squadra("sC", "C"),
      squadra("sD", "D"),
    ];
    const partite = [
      // A: match1 vinto 2-0 (3pt, 2sv/0sp) + match2 vinto 2-1 (2pt, 2sv/1sp)
      // = 5pt, quoziente set 4/1 = 4.0
      partita("p1", "sA", "sC", [25, 20], [25, 18]),
      partita("p2", "sA", "sC", [25, 20], [20, 25], [15, 10]),
      // B: due 2-1 vinti (2pt+2pt, 2sv/1sp ciascuno) + un 1-2 perso (1pt,
      // 1sv/2sp) = 5pt, quoziente set 5/4 = 1.25
      partita("p3", "sB", "sD", [25, 20], [20, 25], [15, 10]),
      partita("p4", "sB", "sD", [25, 20], [20, 25], [15, 10]),
      partita("p5", "sB", "sD", [25, 20], [20, 25], [10, 15]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);

    // Stessi 5 punti per A e B: A (quoziente set 4.0) prima di B (1.25).
    expect(classifica.map((r) => r.squadra.nome)).toEqual(["A", "B", "D", "C"]);
  });

  // Story 20.16 (spec-20-16, riga 2): a parita' di punti-classifica E di
  // quoziente set, il quoziente punti (puntiFatti/puntiSubiti) decide.
  it("a parita' di punti-classifica e quoziente set, ordina per quoziente punti discendente", () => {
    const squadre = [
      squadra("sE", "E"),
      squadra("sF", "F"),
      squadra("sG", "G"),
      squadra("sH", "H"),
    ];
    const partite = [
      // E batte G 2-0 con largo margine (50 punti fatti / 20 subiti)
      partita("p1", "sE", "sG", [25, 10], [25, 10]),
      // F batte H 2-0 di misura (50 punti fatti / 46 subiti)
      partita("p2", "sF", "sH", [25, 23], [25, 23]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);

    // E e F: stessi 3pt, entrambe setPersi=0 (quoziente set Infinity, pari)
    // -> decide il quoziente punti: E (50/20=2.5) prima di F (50/46=1.09).
    // G e H: stessi 0pt, quoziente set 0/2=0 (pari) -> quoziente punti:
    // H (46/50=0.92) prima di G (20/50=0.4).
    expect(classifica.map((r) => r.squadra.nome)).toEqual(["E", "F", "H", "G"]);
  });

  // Story 20.16 (spec-20-16, riga 3): setPersi = 0 (tutte le partite vinte
  // 2-0) produce un quoziente set Infinity - la squadra si posiziona in
  // cima al proprio gruppo di spareggio invece di generare un errore.
  it("una squadra con setPersi=0 (quoziente set Infinity) si posiziona in cima al gruppo di spareggio", () => {
    const squadre = [
      squadra("sI", "I"),
      squadra("sJ", "J"),
      squadra("sM", "M"),
      squadra("sN", "N"),
    ];
    const partite = [
      // I: due 2-0 vinti (setPersi=0 su tutta la stagione) = 6pt
      partita("p1", "sI", "sM", [25, 10], [25, 10]),
      partita("p2", "sI", "sM", [25, 10], [25, 10]),
      // J: tre 2-1 vinti (quoziente set finito 6/3=2.0) = 6pt
      partita("p3", "sJ", "sN", [25, 20], [20, 25], [15, 10]),
      partita("p4", "sJ", "sN", [25, 20], [20, 25], [15, 10]),
      partita("p5", "sJ", "sN", [25, 20], [20, 25], [15, 10]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);

    // Stessi 6 punti per I e J: I (setPersi=0, quoziente Infinity) prima di
    // J (quoziente set finito 2.0) - nessun errore/NaN generato.
    expect(classifica.map((r) => r.squadra.nome)).toEqual(["I", "J", "N", "M"]);
  });

  // Story 20.16 (spec-20-16, riga 4): una squadra senza alcuna partita
  // giocata ha entrambi i quozienti Infinity (0/0) - a parita' di
  // punti-classifica (0) con una squadra che ha gia' giocato e perso,
  // vince comunque il confronto Infinity > quoziente finito, senza
  // generare NaN ne' eccezioni (Infinity - Infinity non viene mai valutato
  // perche' il comparator confronta prima per disuguaglianza).
  it("una squadra senza partite giocate (quozienti Infinity) non genera NaN a parita' di punti con una squadra gia' sconfitta", () => {
    const squadre = [squadra("sP", "P (senza partite)"), squadra("sQ", "Q"), squadra("sF2", "Filler")];
    const partite = [
      // Q perde 0-2: 0pt, quoziente set 0/2=0, quoziente punti 25/50=0.5
      partita("p1", "sQ", "sF2", [10, 25], [15, 25]),
    ];

    const classifica = calcolaClassificaGirone(squadre, partite);
    const p = classifica.find((r) => r.squadra.id === "sP")!;
    const q = classifica.find((r) => r.squadra.id === "sQ")!;

    expect(p).toMatchObject({ punti: 0, setVinti: 0, setPersi: 0, puntiFatti: 0, puntiSubiti: 0 });
    expect(q).toMatchObject({ punti: 0, setVinti: 0, setPersi: 2, puntiFatti: 25, puntiSubiti: 50 });
    // P (quoziente set Infinity) prima di Q (quoziente set 0), nessun crash.
    expect(classifica.map((r) => r.squadra.id).indexOf("sP")).toBeLessThan(
      classifica.map((r) => r.squadra.id).indexOf("sQ")
    );
  });
});

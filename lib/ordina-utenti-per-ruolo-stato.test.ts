import { describe, expect, it } from "vitest";
import type { Ruolo } from "@prisma/client";
import { ordinaUtentiPerRuolo, ordinaUtentiPerStato } from "./ordina-utenti-per-ruolo-stato";

type RigaRuolo = { ruoli: Ruolo[]; email: string };
type RigaStato = { attivo: boolean; email: string };

describe("ordinaUtentiPerRuolo", () => {
  it("ordina per priorita' RUOLI_VALIDI: Allenatore prima di Atleta prima di Admin", () => {
    const utenti: RigaRuolo[] = [
      { ruoli: ["ADMIN"], email: "admin@example.com" },
      { ruoli: ["ALLENATORE"], email: "allenatore@example.com" },
      { ruoli: ["ATLETA"], email: "atleta@example.com" },
    ];

    const ordinati = ordinaUtentiPerRuolo(utenti);

    expect(ordinati.map((u) => u.email)).toEqual([
      "allenatore@example.com",
      "atleta@example.com",
      "admin@example.com",
    ]);
  });

  it("un Utente con piu' Ruoli usa il Ruolo di indice piu' basso (piu' prioritario)", () => {
    const utenti: RigaRuolo[] = [
      { ruoli: ["DIRIGENTE", "ALLENATORE"], email: "misto@example.com" },
      { ruoli: ["ATLETA"], email: "atleta@example.com" },
    ];

    const ordinati = ordinaUtentiPerRuolo(utenti);

    // ALLENATORE (indice 0) batte ATLETA (indice 1), anche se DIRIGENTE
    // (indice 4) e' presente sullo stesso Utente.
    expect(ordinati.map((u) => u.email)).toEqual([
      "misto@example.com",
      "atleta@example.com",
    ]);
  });

  it("a parita' di priorita', ordina alfabeticamente per email", () => {
    const utenti: RigaRuolo[] = [
      { ruoli: ["ATLETA"], email: "zeta@example.com" },
      { ruoli: ["ATLETA"], email: "alfa@example.com" },
    ];

    const ordinati = ordinaUtentiPerRuolo(utenti);

    expect(ordinati.map((u) => u.email)).toEqual([
      "alfa@example.com",
      "zeta@example.com",
    ]);
  });

  it("un Utente senza alcun Ruolo assegnato finisce in fondo", () => {
    const utenti: RigaRuolo[] = [
      { ruoli: [], email: "senzaruolo@example.com" },
      { ruoli: ["SITE_MANAGER"], email: "sitemanager@example.com" },
    ];

    const ordinati = ordinaUtentiPerRuolo(utenti);

    expect(ordinati.map((u) => u.email)).toEqual([
      "sitemanager@example.com",
      "senzaruolo@example.com",
    ]);
  });

  it("restituisce un array vuoto per un input vuoto", () => {
    expect(ordinaUtentiPerRuolo([])).toEqual([]);
  });

  it("non muta l'array originale (ritorna una copia)", () => {
    const utenti: RigaRuolo[] = [
      { ruoli: ["ATLETA"], email: "zeta@example.com" },
      { ruoli: ["ALLENATORE"], email: "alfa@example.com" },
    ];
    const originale = [...utenti];

    ordinaUtentiPerRuolo(utenti);

    expect(utenti).toEqual(originale);
  });
});

describe("ordinaUtentiPerStato", () => {
  it("ordina Attivo prima di Disattivato", () => {
    const utenti: RigaStato[] = [
      { attivo: false, email: "disattivato@example.com" },
      { attivo: true, email: "attivo@example.com" },
    ];

    const ordinati = ordinaUtentiPerStato(utenti);

    expect(ordinati.map((u) => u.email)).toEqual([
      "attivo@example.com",
      "disattivato@example.com",
    ]);
  });

  it("a parita' di stato, ordina alfabeticamente per email", () => {
    const utenti: RigaStato[] = [
      { attivo: true, email: "zeta@example.com" },
      { attivo: true, email: "alfa@example.com" },
    ];

    const ordinati = ordinaUtentiPerStato(utenti);

    expect(ordinati.map((u) => u.email)).toEqual([
      "alfa@example.com",
      "zeta@example.com",
    ]);
  });

  it("restituisce un array vuoto per un input vuoto", () => {
    expect(ordinaUtentiPerStato([])).toEqual([]);
  });

  it("non muta l'array originale (ritorna una copia)", () => {
    const utenti: RigaStato[] = [
      { attivo: false, email: "zeta@example.com" },
      { attivo: true, email: "alfa@example.com" },
    ];
    const originale = [...utenti];

    ordinaUtentiPerStato(utenti);

    expect(utenti).toEqual(originale);
  });
});

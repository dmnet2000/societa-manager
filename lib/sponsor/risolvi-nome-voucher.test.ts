import { describe, expect, it } from "vitest";
import { risolviNomeVoucher, type IdentitaVoucher } from "./risolvi-nome-voucher";

function identita(overrides: Partial<IdentitaVoucher> = {}): IdentitaVoucher {
  return {
    allenatore: null,
    atletaPropria: null,
    genitoreDiAtleta: null,
    email: "utente@esempio.it",
    ...overrides,
  };
}

describe("risolviNomeVoucher", () => {
  it("usa nome+cognome dell'Allenatore quando presente", () => {
    const risultato = risolviNomeVoucher(
      identita({ allenatore: { nome: "Mario", cognome: "Rossi" } })
    );
    expect(risultato).toBe("Mario Rossi");
  });

  it("usa il nome dell'Atleta auto-agganciata quando non c'è un Allenatore", () => {
    const risultato = risolviNomeVoucher(
      identita({ atletaPropria: { nome: "Bianchi Giulia" } })
    );
    expect(risultato).toBe("Bianchi Giulia");
  });

  it("usa 'Genitore di <nome Atleta>' quando non c'è né Allenatore né Atleta propria", () => {
    const risultato = risolviNomeVoucher(
      identita({ genitoreDiAtleta: { nome: "Verdi Anna" } })
    );
    expect(risultato).toBe("Genitore di Verdi Anna");
  });

  it("usa l'email come fallback quando nessuna identità è collegata (Admin/Dirigente/Segreteria)", () => {
    const risultato = risolviNomeVoucher(identita({ email: "admin@esempio.it" }));
    expect(risultato).toBe("admin@esempio.it");
  });

  // Review fix (trovato indipendentemente da Blind Hunter, Edge Case Hunter
  // e Acceptance Auditor): senza un fallback finale, nessuna identità
  // risolta + email vuota renderizzava il voucher con un nome vuoto.
  it("usa 'Utente' come fallback finale quando anche l'email è vuota", () => {
    const risultato = risolviNomeVoucher(identita({ email: "" }));
    expect(risultato).toBe("Utente");
  });

  it("l'Allenatore ha priorità sull'Atleta propria quando entrambi sono presenti", () => {
    const risultato = risolviNomeVoucher(
      identita({
        allenatore: { nome: "Mario", cognome: "Rossi" },
        atletaPropria: { nome: "Bianchi Giulia" },
      })
    );
    expect(risultato).toBe("Mario Rossi");
  });

  it("l'Atleta propria ha priorità sul Genitore-di quando entrambi sono presenti", () => {
    const risultato = risolviNomeVoucher(
      identita({
        atletaPropria: { nome: "Bianchi Giulia" },
        genitoreDiAtleta: { nome: "Verdi Anna" },
      })
    );
    expect(risultato).toBe("Bianchi Giulia");
  });
});

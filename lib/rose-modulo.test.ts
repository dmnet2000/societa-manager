import { describe, expect, it } from "vitest";
import { leggiModuloRosa } from "./rose-modulo";

function form(campi: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campi)) fd.set(k, v);
  return fd;
}

describe("leggiModuloRosa", () => {
  it("legge giocatori e tesserati, con trim e flag", () => {
    const r = leggiModuloRosa(
      form({
        g0_numero: "7", g0_nome: " Anna ", g0_cognome: "Rossi", g0_capitano: "on",
        g1_numero: "1", g1_nome: "Bea", g1_cognome: "Neri", g1_libero: "on",
        t0_ruolo: "A", t0_nome: " Luca ",
      })
    );
    expect(r).toMatchObject({
      giocatori: [
        { numero: 7, nome: "Anna", cognome: "Rossi", capitano: true, libero: false },
        { numero: 1, nome: "Bea", cognome: "Neri", capitano: false, libero: true },
      ],
      tesserati: [{ ruolo: "A", nome: "Luca" }],
    });
  });

  it("ignora le righe tutte vuote", () => {
    const r = leggiModuloRosa(
      form({ g0_numero: "", g0_nome: " ", g0_cognome: "", g1_numero: "3", g1_nome: "A", g1_cognome: "B", t0_ruolo: "", t0_nome: "" })
    );
    expect("giocatori" in r && r.giocatori).toHaveLength(1);
    expect("tesserati" in r && r.tesserati).toHaveLength(0);
  });

  it("campi non validi: errori per riga e valori restituiti", () => {
    const r = leggiModuloRosa(
      form({
        g0_numero: "0", g0_nome: "A", g0_cognome: "B",
        g1_numero: "a", g1_nome: "", g1_cognome: "B",
        g2_numero: "100", g2_nome: "A", g2_cognome: "B",
        t0_ruolo: "X", t0_nome: "L",
      })
    );
    expect("errori" in r).toBe(true);
    if ("errori" in r) {
      expect(r.errori).toContain("Giocatore 1: il numero di maglia deve essere da 1 a 99.");
      expect(r.errori).toContain("Giocatore 2: il numero di maglia deve essere da 1 a 99.");
      expect(r.errori.some((e) => e.startsWith("Giocatore 2: il nome"))).toBe(true);
      expect(r.errori).toContain("Giocatore 3: il numero di maglia deve essere da 1 a 99.");
      expect(r.errori).toContain("Tesserato 1: il ruolo non è valido.");
      expect(r.inseriti.giocatori).toHaveLength(3);
      expect(r.inseriti.giocatori[1].numero).toBe("a");
    }
  });

  it("ruolo scelto senza nome: errore sul nome, non ignorata", () => {
    const r = leggiModuloRosa(form({ t0_ruolo: "VA", t0_nome: "" }));
    expect("errori" in r && r.errori).toEqual(["Tesserato 1: il nome è obbligatorio (massimo 60 caratteri)."]);
  });

  it("ruolo e nome vuoti: riga ignorata; nome senza ruolo: errore di ruolo", () => {
    const r = leggiModuloRosa(form({ t0_ruolo: "", t0_nome: "" }));
    expect("tesserati" in r && r.tesserati).toHaveLength(0);
    const e = leggiModuloRosa(form({ t0_ruolo: "", t0_nome: "Luca" }));
    expect("errori" in e && e.errori).toEqual(["Tesserato 1: il ruolo non è valido."]);
  });

  it("le etichette seguono la posizione della riga, anche con righe vuote prima", () => {
    const r = leggiModuloRosa(form({ g0_numero: "", g1_numero: "0", g1_nome: "A", g1_cognome: "B" }));
    expect("errori" in r && r.errori).toEqual(["Giocatore 2: il numero di maglia deve essere da 1 a 99."]);
  });

  it("nome oltre 60 caratteri rifiutato", () => {
    const r = leggiModuloRosa(form({ g0_numero: "1", g0_nome: "x".repeat(61), g0_cognome: "B" }));
    expect("errori" in r).toBe(true);
  });
});

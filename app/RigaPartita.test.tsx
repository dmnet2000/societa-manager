import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RigaPartita, type RigaPartitaProps } from "./RigaPartita";
import styles from "./riga-partita.module.css";

// Story 18.35: matrice I/O lato componente, render server statico (il
// componente e' un Server Component puramente presentazionale).
const BASE: RigaPartitaProps = {
  data: "2026-09-30",
  campionatoNome: "U17 Femminile",
  colore: null,
  squadraCasa: "Volley Mogliano",
  squadraOspite: "Volley Zero Branco",
  impianto: "Palestra Olme",
  indirizzoImpianto: "Via Olme 1, Mogliano Veneto",
  destra: { tipo: "ora", valore: "20:30" },
};

function render(props: Partial<RigaPartitaProps> = {}): string {
  return renderToStaticMarkup(<RigaPartita {...BASE} {...props} />);
}

function classe(nome: string): string {
  return `class="${nome}"`;
}

// Classi usate nelle asserzioni: se una mancasse nel CSS module sarebbe
// undefined e le asserzioni "not.toContain" passerebbero a vuoto.
const CLASSI_USATE = [
  "riga",
  "testoScuro",
  "data",
  "dataGiorno",
  "dataNumero",
  "dataMese",
  "srOnly",
  "campionato",
  "squadra",
  "vs",
  "palestra",
  "nomePalestra",
  "contorno",
  "statoRisultato",
  "oraSecondaria",
] as const;

describe("RigaPartita", () => {
  it("le classi del CSS module usate nei test sono definite e distinte", () => {
    const valori = CLASSI_USATE.map((nome) => styles[nome]);
    for (const [i, valore] of valori.entries()) {
      expect(valore, CLASSI_USATE[i]).toEqual(expect.any(String));
      expect(valore.length, CLASSI_USATE[i]).toBeGreaterThan(0);
    }
    expect(new Set(valori).size).toBe(valori.length);
  });

  it("blocco data MER / 30 / SET, parti visive nascoste agli screen reader", () => {
    const html = render();
    expect(html).toMatch(/<time datetime="2026-09-30"/i);
    expect(html).toContain(`${classe(styles.dataGiorno)} aria-hidden="true">MER<`);
    expect(html).toContain(`${classe(styles.dataNumero)} aria-hidden="true">30<`);
    expect(html).toContain(`${classe(styles.dataMese)} aria-hidden="true">SET<`);
  });

  it("data estesa per screen reader", () => {
    expect(render()).toContain(
      `<span ${classe(styles.srOnly)}>mercoledì 30 settembre 2026</span>`,
    );
  });

  it("data invalida: blocco data vuoto, riga comunque mostrata", () => {
    const html = render({ data: "non-una-data" });
    expect(html).not.toMatch(/<time/i);
    expect(html).toContain(`<div ${classe(styles.data)}></div>`);
    expect(html).toContain("Volley Mogliano");
    expect(html).toContain("20:30");
  });

  it("campionato, squadre con vs e palestra", () => {
    const html = render();
    expect(html).toContain(`${classe(styles.campionato)}>U17 Femminile<`);
    expect(html).toContain(`${classe(styles.squadra)}>Volley Mogliano<`);
    expect(html).toContain(`<span ${classe(styles.vs)}>vs</span> Volley Zero Branco`);
    expect(html).toContain(`${classe(styles.nomePalestra)}>Palestra Olme<`);
  });

  it("partita futura: orario a contorno a destra", () => {
    expect(render()).toContain(`<span ${classe(styles.contorno)}>20:30</span>`);
  });

  it("ora vuota o di soli spazi: Orario da definire in piccolo, non a contorno", () => {
    for (const valore of ["", "   "]) {
      const html = render({ destra: { tipo: "ora", valore } });
      expect(html).toContain(`<span ${classe(styles.statoRisultato)}>Orario da definire</span>`);
      expect(html).not.toContain(classe(styles.contorno));
    }
  });

  it("risultato presente: a contorno, stato non mostrato", () => {
    const html = render({
      destra: { tipo: "risultato", risultato: "3-1", stato: "Gara omologata" },
    });
    expect(html).toContain(`<span ${classe(styles.contorno)}>3-1</span>`);
    expect(html).not.toContain("Gara omologata");
  });

  it("risultati: orario in piccolo sotto il risultato", () => {
    const html = render({
      destra: { tipo: "risultato", risultato: "3-1", stato: null, ora: "20:30" },
    });
    expect(html).toContain(
      `<span ${classe(styles.contorno)}>3-1</span><span ${classe(styles.oraSecondaria)}>ore 20:30</span>`,
    );
  });

  it("risultati senza ora (o ora vuota): nessun orario secondario", () => {
    for (const ora of [undefined, null, "  "]) {
      const html = render({
        destra: { tipo: "risultato", risultato: "3-1", stato: null, ora },
      });
      expect(html).not.toContain(classe(styles.oraSecondaria));
    }
  });

  it("risultato assente: stato del portale in piccolo, non a contorno", () => {
    const html = render({
      destra: { tipo: "risultato", risultato: null, stato: "Rinviata" },
    });
    expect(html).toContain(`<span ${classe(styles.statoRisultato)}>Rinviata</span>`);
    expect(html).not.toContain(classe(styles.contorno));
  });

  it("risultato e stato assenti, vuoti o solo spazi: Risultato non disponibile", () => {
    const casi: Array<[string | null, string | null]> = [
      [null, null],
      ["", ""],
      ["   ", "  "],
      [" ", null],
    ];
    for (const [risultato, stato] of casi) {
      const html = render({ destra: { tipo: "risultato", risultato, stato } });
      expect(html).toContain(
        `<span ${classe(styles.statoRisultato)}>Risultato non disponibile</span>`,
      );
      expect(html).not.toContain(classe(styles.contorno));
    }
  });

  it("risultato vuoto ma stato presente: mostra lo stato", () => {
    const html = render({ destra: { tipo: "risultato", risultato: "  ", stato: " Rinviata " } });
    expect(html).toContain(`<span ${classe(styles.statoRisultato)}>Rinviata</span>`);
  });

  it("colore del Campionato come sfondo, default #2e6f99 se assente", () => {
    expect(render({ colore: "#aa0000" })).toContain('style="background-color:#aa0000"');
    const html = render({ colore: null });
    expect(html).toContain('style="background-color:#2e6f99"');
    expect(html).toContain(`class="${styles.riga}"`);
  });

  it("colore chiaro: variante a testo scuro", () => {
    expect(render({ colore: "#ffff66" })).toContain(
      `class="${styles.riga} ${styles.testoScuro}"`,
    );
  });

  it("colore normalizzato: sfondo e testo scuro non divergono", () => {
    // Con spazi e in forma breve: prima lo style inline lo avrebbe usato
    // cosi' com'e' mentre testoScuroSuSfondo lo rifiutava (testo bianco su
    // bianco).
    const html = render({ colore: "  #FFF " });
    expect(html).toContain('style="background-color:#ffffff"');
    expect(html).toContain(`class="${styles.riga} ${styles.testoScuro}"`);
  });

  it("colore non valido: default sia per lo sfondo sia per il testo", () => {
    const html = render({ colore: "white" });
    expect(html).toContain('style="background-color:#2e6f99"');
    expect(html).toContain(`class="${styles.riga}"`);
  });

  it("Naviga in nuova scheda con noopener noreferrer", () => {
    const html = render();
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Naviga verso Palestra Olme"');
    expect(html).toContain(
      "https://www.google.com/maps/search/?api=1&amp;query=Via%20Olme%201%2C%20Mogliano%20Veneto",
    );
  });

  it("senza palestra ne' indirizzo: riga palestra omessa, niente Naviga", () => {
    const html = render({ impianto: null, indirizzoImpianto: null });
    expect(html).not.toContain(classe(styles.palestra));
    expect(html).not.toContain("Naviga");
  });

  it("palestra senza indirizzo: nome mostrato, niente Naviga", () => {
    const html = render({ indirizzoImpianto: null });
    expect(html).toContain("Palestra Olme");
    expect(html).not.toContain("Naviga");
  });

  it("indirizzo senza nome palestra: Naviga con etichetta generica", () => {
    expect(render({ impianto: null })).toContain(
      'aria-label="Naviga verso il luogo della partita"',
    );
  });
});

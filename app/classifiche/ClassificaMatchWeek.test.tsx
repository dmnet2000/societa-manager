import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassificaMatchWeek } from "./ClassificaMatchWeek";
import type { ClassificaVista } from "@/lib/sincronizza-gare-fipav/vista-home-live";
import type { RigaClassificaFipav } from "@/lib/sincronizza-gare-fipav/parser";
import styles from "./classifiche.module.css";

// Story 18.36: tabella classifica Match Week di /classifiche, render server
// statico (matrice I/O lato componente).
function riga(posizione: string, squadra: string, punti: string | null = "10"): RigaClassificaFipav {
  return {
    posizione,
    squadra,
    punti,
    partiteGiocate: "9",
    partiteVinte: "7",
    partitePerse: "2",
    setFatti: "23",
    setSubiti: "10",
    quozienteSet: "2.300",
    puntiFatti: "560",
    puntiSubiti: "470",
    quozientePunti: "1.191",
    penalizzazione: "0",
  };
}

const BASE: ClassificaVista = {
  campionatoId: "camp-1",
  campionatoNome: "Serie C",
  campionatoColore: null,
  gruppoNome: "Prima Squadra",
  righe: [riga("1", "Alfa", "24"), riga("2", "Volley X"), riga("3", "Beta")],
  nostraSquadra: "Volley X",
};

function render(classifica: Partial<ClassificaVista> = {}): string {
  return renderToStaticMarkup(<ClassificaMatchWeek classifica={{ ...BASE, ...classifica }} />);
}

function conteggio(html: string, testo: string): number {
  return html.split(testo).length - 1;
}

function classe(nome: string): string {
  return `class="${nome}"`;
}

describe("ClassificaMatchWeek", () => {
  it("le classi del CSS module usate nei test sono definite e distinte", () => {
    const nomi = [styles.posizione, styles.colonnaPunti, styles.rigaNostra, styles.fasciaTitolo, styles.fasciaTestoScuro];
    for (const nome of nomi) expect(nome).toBeTruthy();
    expect(new Set(nomi).size).toBe(nomi.length);
  });

  it("section etichettata dall'h2 in fascia del colore Campionato (default), tabella con caption", () => {
    const html = render();
    expect(html).toContain('<section aria-labelledby="classifica-camp-1">');
    expect(html).toContain(
      `<h2 ${classe(styles.fasciaTitolo)} id="classifica-camp-1" style="background-color:#2e6f99">Serie C — Prima Squadra</h2>`
    );
    expect(html).toContain('role="region" aria-label="Tabella Serie C — Prima Squadra"');
    expect(html).toContain("Classifica Serie C — Prima Squadra</caption>");
  });

  it("13 intestazioni, sigle con nome esteso", () => {
    const html = render();
    expect(conteggio(html, '<th scope="col"')).toBe(13);
    expect(html).toContain('<abbr title="Quoziente Set">QS</abbr>');
    expect(html).toContain('<abbr title="Penalizzazione">Penal.</abbr>');
  });

  it("riga tipica: posizione nel quadratino rosso, punti in risalto, 13 celle", () => {
    const html = render();
    expect(html).toContain(`<span ${classe(styles.posizione)}>1</span>`);
    expect(html).toContain(`<td ${classe(styles.colonnaPunti)}>24</td>`);
    const primaRiga = html.slice(html.indexOf("<tbody>"), html.indexOf("</tr>", html.indexOf("<tbody>")));
    expect(conteggio(primaRiga, "<td") + conteggio(primaRiga, '<th scope="row"')).toBe(13);
  });

  it("valori assenti e posizione di soli spazi -> '—'", () => {
    const html = render({
      righe: [{ ...riga("  ", "Alfa", null), quozienteSet: null }],
      nostraSquadra: null,
    });
    expect(html).toContain(`<span ${classe(styles.posizione)}>—</span>`);
    expect(html).toContain(`<td ${classe(styles.colonnaPunti)}>—</td>`);
    expect(html).toContain("<td>—</td>");
  });

  it("nostra squadra: una sola riga evidenziata, annunciata agli screen reader", () => {
    const html = render({
      righe: [riga("1", "Alfa"), riga("2", "VOLLEY X"), riga("3", "volley  x")],
    });
    expect(conteggio(html, styles.rigaNostra)).toBe(1);
    expect(conteggio(html, ", la nostra squadra")).toBe(1);
    expect(html.indexOf(styles.rigaNostra)).toBeGreaterThan(html.indexOf(">Alfa<"));
    expect(html.indexOf(", la nostra squadra")).toBeGreaterThan(html.indexOf("VOLLEY X"));
    expect(html.indexOf(", la nostra squadra")).toBeLessThan(html.indexOf("volley  x"));
  });

  it("nostraSquadra null o assente dalla classifica: nessuna riga evidenziata", () => {
    for (const nostraSquadra of [null, "Gamma"]) {
      const html = render({ nostraSquadra });
      expect(html).not.toContain(styles.rigaNostra);
      expect(html).not.toContain("la nostra squadra");
    }
  });

  it("colore chiaro: fascia del titolo con testo scuro", () => {
    const html = render({ campionatoColore: "#ffff66" });
    expect(html).toContain(
      `class="${styles.fasciaTitolo} ${styles.fasciaTestoScuro}" id="classifica-camp-1" style="background-color:#ffff66"`
    );
    expect(render()).not.toContain(styles.fasciaTestoScuro);
  });
});

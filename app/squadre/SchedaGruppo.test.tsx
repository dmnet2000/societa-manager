import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SchedaGruppo, propsSchedaGruppo, type SchedaGruppoProps } from "./SchedaGruppo";
import styles from "./squadre.module.css";

// Story 18.37: card squadra Match Week di /squadre, render server statico.
const BASE: SchedaGruppoProps = {
  nome: "Under 14 Blu",
  categoria: "Under 14",
  urlFoto: "https://example.test/foto.jpg?v=1",
  allenatori: [{ id: "al1", nome: "Marco", cognome: "Rossi" }],
  atlete: [
    { id: "a1", nome: "ANNA VERDI", fotoUrl: null, numero: 7 },
    { id: "a2", nome: "BEA COLOMBO", fotoUrl: "https://example.test/a2.jpg", numero: null },
  ],
};

function render(props: Partial<SchedaGruppoProps> = {}): string {
  return renderToStaticMarkup(<SchedaGruppo {...BASE} {...props} />);
}

function classe(nome: string): string {
  return `class="${nome}"`;
}

describe("SchedaGruppo", () => {
  it("le classi del CSS module usate nei test sono definite e distinte", () => {
    const nomi = [
      styles.corniceGruppo,
      styles.schedaGruppo,
      styles.immagineGruppo,
      styles.placeholderFoto,
      styles.nomeGruppo,
      styles.numeroAtleta,
      styles.inizialiAtleta,
      styles.listaAllenatori,
      styles.srOnly,
    ];
    for (const nome of nomi) expect(nome).toBeTruthy();
    expect(new Set(nomi).size).toBe(nomi.length);
  });

  it("cornice con filo bianco attorno alla scheda, nome squadra in h3 su fascia", () => {
    const html = render();
    // (React 19 antepone un <link rel="preload"> per l'immagine: toContain.)
    expect(html).toContain(`<div ${classe(styles.corniceGruppo)}><div ${classe(styles.schedaGruppo)}>`);
    expect(html).toContain(`<h3 ${classe(styles.nomeGruppo)}>Under 14 Blu</h3>`);
    expect(html).toContain("<li>Marco Rossi</li>");
  });

  it("con foto: immagine con alt descrittivo, nessun placeholder", () => {
    const html = render();
    expect(html).toContain(
      `<img ${classe(styles.immagineGruppo)} src="https://example.test/foto.jpg?v=1" alt="Foto di squadra di Under 14 Blu" loading="lazy" decoding="async"/>`
    );
    expect(html).not.toContain(styles.placeholderFoto);
  });

  it("senza foto: placeholder con nome accessibile", () => {
    const html = render({ urlFoto: null });
    expect(html).toContain(
      `<div ${classe(styles.placeholderFoto)} role="img" aria-label="Nessuna foto di squadra caricata per Under 14 Blu"></div>`
    );
    expect(html).not.toContain(styles.immagineGruppo);
  });

  it("numero di maglia nel quadratino con testo per screen reader; niente numero se assente", () => {
    const html = render();
    expect(html).toContain(
      `<span ${classe(styles.numeroAtleta)}><span ${classe(styles.srOnly)}>numero di maglia </span>7</span>`
    );
    expect(html.split(styles.numeroAtleta).length - 1).toBe(1);
  });

  it("iniziali senza foto atleta, foto se presente", () => {
    const html = render();
    expect(html).toContain(`<div ${classe(styles.inizialiAtleta)} aria-hidden="true">AV</div>`);
    expect(html).toContain('src="https://example.test/a2.jpg"');
  });

  it("nessun allenatore e nessuna atleta: niente elenco staff, messaggio esplicito", () => {
    const html = render({ allenatori: [], atlete: [] });
    expect(html).not.toContain(styles.listaAllenatori);
    expect(html).toContain("Nessuna atleta assegnata.");
  });

  it("numero di maglia 0: mostrato (solo null lo nasconde)", () => {
    const html = render({ atlete: [{ id: "z", nome: "ZOE", fotoUrl: null, numero: 0 }] });
    expect(html).toContain(`<span ${classe(styles.srOnly)}>numero di maglia </span>0</span>`);
  });
});

describe("propsSchedaGruppo", () => {
  const gruppo = {
    nome: "Under 14 Blu",
    categoria: "Under 14",
    allenatori: [{ allenatore: { id: "al1", nome: "Marco", cognome: "Rossi" } }],
    atlete: BASE.atlete,
  };
  const url = () => "https://storage.test/foto-squadra/g1";

  it("foto con data: URL pubblico + ?v= codificato", () => {
    expect(propsSchedaGruppo(gruppo, "2026-10-03T10:00:00.000Z", url).urlFoto).toBe(
      "https://storage.test/foto-squadra/g1?v=2026-10-03T10%3A00%3A00.000Z"
    );
  });

  it("foto con aggiornatoIl null: URL con ?v= vuoto", () => {
    expect(propsSchedaGruppo(gruppo, null, url).urlFoto).toBe("https://storage.test/foto-squadra/g1?v=");
  });

  it("nessuna foto (undefined): urlFoto null, URL mai calcolato", () => {
    let chiamato = false;
    const props = propsSchedaGruppo(gruppo, undefined, () => {
      chiamato = true;
      return "x";
    });
    expect(props.urlFoto).toBeNull();
    expect(chiamato).toBe(false);
  });

  it("allenatori appiattiti dalle righe di join, altri campi invariati", () => {
    const props = propsSchedaGruppo(gruppo, undefined, url);
    expect(props.allenatori).toEqual([{ id: "al1", nome: "Marco", cognome: "Rossi" }]);
    expect(props.atlete).toBe(BASE.atlete);
    expect(props.nome).toBe("Under 14 Blu");
    expect(props.categoria).toBe("Under 14");
  });
});

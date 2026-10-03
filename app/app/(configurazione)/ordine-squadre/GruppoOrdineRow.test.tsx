import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Le Server Action non servono a un render statico - mockate per non
// trascinare nel test Prisma/sessione.
vi.mock("./actions", () => ({
  spostaGruppoAction: vi.fn(),
  impostaVisibilitaGruppoAction: vi.fn(),
  impostaVisibilitaClassificaAction: vi.fn(),
}));

const { GruppoOrdineRow } = await import("./GruppoOrdineRow");

type Campionato = { id: string; nome: string; classificaVisibile: boolean };

function render(campionati: Campionato[]): string {
  return renderToStaticMarkup(
    <GruppoOrdineRow
      gruppo={{
        id: "g1",
        nome: "Under 14",
        categoria: "U14",
        visibilePubblico: true,
        campionati,
      }}
      primo
      ultimo={false}
    />
  );
}

// Story 19.17: interruttore Nascondi/Mostra classifica per Campionato.
describe("GruppoOrdineRow - interruttore classifica", () => {
  it("classifica visibile: badge 'Classifica visibile', bottone Nascondi, hidden input = false", () => {
    const html = render([{ id: "c1", nome: "U14 A", classificaVisibile: true }]);

    expect(html).toContain("U14 A");
    expect(html).toContain("Classifica visibile");
    expect(html).not.toContain("Classifica nascosta");
    expect(html).toContain('name="classificaVisibile" value="false"');
    expect(html).toContain('aria-label="Nascondi la classifica di &quot;U14 A&quot;');
    expect(html).toMatch(/aria-label="Nascondi la classifica[^"]*"[^>]*>Nascondi<\/button>/);
  });

  it("classifica nascosta: badge 'Classifica nascosta', bottone Mostra, hidden input = true", () => {
    const html = render([{ id: "c1", nome: "U14 A", classificaVisibile: false }]);

    expect(html).toContain("Classifica nascosta");
    expect(html).not.toContain("Classifica visibile");
    expect(html).toContain('name="classificaVisibile" value="true"');
    expect(html).toContain('aria-label="Mostra la classifica di &quot;U14 A&quot;');
    expect(html).toMatch(/aria-label="Mostra la classifica[^"]*"[^>]*>Mostra<\/button>/);
  });

  it("un interruttore per ciascun Campionato, ognuno con il proprio id", () => {
    const html = render([
      { id: "c1", nome: "U14 A", classificaVisibile: true },
      { id: "c2", nome: "U14 B", classificaVisibile: false },
    ]);

    expect(html).toContain('name="id" value="c1"');
    expect(html).toContain('name="id" value="c2"');
    expect(html.match(/name="classificaVisibile"/g)).toHaveLength(2);
  });

  it("nessun elenco classifiche se la squadra non ha Campionati con link FIPAV", () => {
    const html = render([]);

    expect(html).not.toContain("<ul");
    expect(html).not.toContain("classificaVisibile");
    expect(html).not.toContain("Classifica");
  });
});

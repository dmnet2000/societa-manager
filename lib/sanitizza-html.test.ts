import { describe, expect, it } from "vitest";
import { sanitizzaHtml } from "./sanitizza-html";

// Story 19.9 (Epic 19, Ruolo Site Manager): il punto piu' a rischio di
// questa storia (prima introduzione di dangerouslySetInnerHTML nel
// progetto) - questi test coprono l'allowlist esplicita indipendentemente
// dal render (app/[...slug]/page.tsx), che la richiama una seconda volta
// come difesa in profondita'.
describe("sanitizzaHtml", () => {
  it("mantiene i tag dell'allowlist (h2/h3/p/strong/em/ul/ol/li/a/img/br)", () => {
    const html =
      "<h2>Titolo</h2><h3>Sottotitolo</h3><p>Testo <strong>forte</strong> <em>corsivo</em><br>a capo.</p>" +
      '<ul><li>Uno</li></ul><ol><li>Due</li></ol><a href="/altra-pagina">Link</a>' +
      '<img src="/immagine.png" alt="descrizione">';

    const risultato = sanitizzaHtml(html);

    expect(risultato).toContain("<h2>Titolo</h2>");
    expect(risultato).toContain("<h3>Sottotitolo</h3>");
    expect(risultato).toContain("<strong>forte</strong>");
    expect(risultato).toContain("<em>corsivo</em>");
    expect(risultato).toContain("<br>");
    expect(risultato).toContain("<li>Uno</li>");
    expect(risultato).toContain("<li>Due</li>");
    expect(risultato).toContain('href="/altra-pagina"');
    expect(risultato).toContain('src="/immagine.png"');
    expect(risultato).toContain('alt="descrizione"');
  });

  it("rimuove un tag <script> e il suo contenuto", () => {
    const risultato = sanitizzaHtml('<p>Testo</p><script>alert("x")</script>');

    expect(risultato).not.toContain("<script");
    expect(risultato).not.toContain("alert");
    expect(risultato).toContain("<p>Testo</p>");
  });

  it("rimuove un attributo onerror/onclick (event handler inline)", () => {
    const risultato = sanitizzaHtml(
      '<img src="/x.png" onerror="alert(1)"><p onclick="alert(2)">Testo</p>'
    );

    expect(risultato).not.toContain("onerror");
    expect(risultato).not.toContain("onclick");
  });

  it("rimuove un href javascript: da un link", () => {
    const risultato = sanitizzaHtml('<a href="javascript:alert(1)">Click</a>');

    expect(risultato).not.toContain("javascript:");
  });

  it("rimuove un tag fuori allowlist (es. <table>/<iframe>) mantenendo il testo interno quando sicuro", () => {
    const risultato = sanitizzaHtml(
      "<table><tr><td>Cella</td></tr></table><iframe src=\"https://esempio.it\"></iframe>"
    );

    expect(risultato).not.toContain("<table");
    expect(risultato).not.toContain("<iframe");
  });

  it('forza rel="noopener noreferrer" su un link con target="_blank" (reverse tabnabbing)', () => {
    const risultato = sanitizzaHtml('<a href="https://esempio.it" target="_blank">Link</a>');

    expect(risultato).toContain('rel="noopener noreferrer"');
  });

  it('non tocca rel su un link senza target="_blank"', () => {
    const risultato = sanitizzaHtml('<a href="https://esempio.it">Link</a>');

    expect(risultato).not.toContain("rel=");
  });

  it("un dato gia' pericoloso in ingresso (bypass ipotetico del salvataggio) resta innocuo al render", () => {
    // Simula un valore che, per ipotesi, sarebbe finito in colonna senza
    // passare dalla sanitizzazione al salvataggio (Story 19.10) - questa
    // funzione e' il secondo passaggio, quello che DAVVERO protegge un
    // Visitatore (Boundaries "Always" della spec, difesa in profondita').
    const risultato = sanitizzaHtml(
      '<p>Benvenuti</p><script>document.location="https://evil.example"</script>'
    );

    expect(risultato).toBe("<p>Benvenuti</p>");
  });
});

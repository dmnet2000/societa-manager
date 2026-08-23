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
    // sanitize-html serializza i void element auto-chiusi ("<br />", XHTML-
    // style) invece di "<br>" (HTML5-style) di isomorphic-dompurify - stessa
    // resa nel browser, nessuna differenza funzionale/di sicurezza - il
    // check resta agnostico al formato esatto.
    expect(risultato).toContain("<br");
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

  // Story 19.14 (Epic 19, Ruolo Site Manager): <iframe> e' entrato
  // nell'allowlist con questa storia (blocco Video, ristretto a due soli
  // hostname via allowedIframeHostnames - vedi i test dedicati piu' sotto),
  // quindi non e' piu' un esempio valido di "tag fuori allowlist" - sostituito
  // con <video>, ancora oggi fuori allowlist.
  it("rimuove un tag fuori allowlist (es. <table>/<video>) mantenendo il testo interno quando sicuro", () => {
    const risultato = sanitizzaHtml(
      '<table><tr><td>Cella</td></tr></table><video src="https://esempio.it/video.mp4"></video>'
    );

    expect(risultato).not.toContain("<table");
    expect(risultato).not.toContain("<video");
  });

  it('forza rel="noopener noreferrer" su un link con target="_blank" (reverse tabnabbing)', () => {
    const risultato = sanitizzaHtml('<a href="https://esempio.it" target="_blank">Link</a>');

    expect(risultato).toContain('rel="noopener noreferrer"');
  });

  it('non tocca rel su un link senza target="_blank"', () => {
    const risultato = sanitizzaHtml('<a href="https://esempio.it">Link</a>');

    expect(risultato).not.toContain("rel=");
  });

  // Story 19.13 (Epic 19, Ruolo Site Manager): allineamento testo/immagini
  // e ridimensionamento immagini - stessa filosofia "insieme chiuso di
  // stringhe letterali", mai uno style libero.
  it("mantiene data-align su p/h2/h3/img quando il valore e' nell'insieme consentito", () => {
    const html =
      '<p data-align="justify">Testo</p><h2 data-align="center">Titolo</h2>' +
      '<h3 data-align="right">Sottotitolo</h3><img src="/x.png" data-align="left">';

    const risultato = sanitizzaHtml(html);

    expect(risultato).toContain('data-align="justify"');
    expect(risultato).toContain('data-align="center"');
    expect(risultato).toContain('data-align="right"');
    expect(risultato).toContain('data-align="left"');
  });

  it("rimuove data-align su p/h2/h3/img quando il valore non e' nell'insieme consentito (manomissione)", () => {
    const html =
      '<p data-align="rainbow">Testo</p><h2 data-align="rainbow">Titolo</h2>' +
      '<h3 data-align="rainbow">Sottotitolo</h3><img src="/x.png" data-align="float">';

    const risultato = sanitizzaHtml(html);

    expect(risultato).not.toContain("data-align");
    expect(risultato).toContain("<p>Testo</p>");
    expect(risultato).toContain("<h2>Titolo</h2>");
    expect(risultato).toContain("<h3>Sottotitolo</h3>");
  });

  it("data-align='justify' non e' consentito su img (insieme diverso da p/h2/h3)", () => {
    const risultato = sanitizzaHtml('<img src="/x.png" data-align="justify">');

    expect(risultato).not.toContain("data-align");
  });

  it("mantiene width/height su img quando sono stringhe di sole cifre nel range valido (40-4000)", () => {
    const risultato = sanitizzaHtml('<img src="/x.png" width="320" height="240">');

    expect(risultato).toContain('width="320"');
    expect(risultato).toContain('height="240"');
  });

  it("rimuove width/height su img quando non sono stringhe di sole cifre (manomissione)", () => {
    const html = '<img src="/x.png" width="320px" height="expression(alert(1))">';

    const risultato = sanitizzaHtml(html);

    expect(risultato).not.toContain("width=");
    expect(risultato).not.toContain("height=");
  });

  // Review fix (Edge Case Hunter, Story 19.13): "0" e' una stringa di sole
  // cifre (SOLO_CIFRE/^\d+$/ la accetterebbe) ma un'immagine 0x0 e'
  // invisibile senza preavviso - il vero cancello (sanitizzaHtml) deve
  // rifiutarla, non solo la NodeView di resize lato editor (che impone lo
  // stesso minimo di 40px solo durante il trascinamento, aggirabile
  // incollando HTML grezzo).
  it("rimuove width/height='0' su img (produrrebbe un'immagine invisibile)", () => {
    const risultato = sanitizzaHtml('<img src="/x.png" width="0" height="0">');

    expect(risultato).not.toContain("width=");
    expect(risultato).not.toContain("height=");
  });

  it("rimuove width/height sotto il minimo di 40px (sotto la soglia della NodeView di resize)", () => {
    const risultato = sanitizzaHtml('<img src="/x.png" width="10" height="39">');

    expect(risultato).not.toContain("width=");
    expect(risultato).not.toContain("height=");
  });

  it("rimuove width/height sopra il tetto massimo di 4000px (valore assurdo/manomesso)", () => {
    const risultato = sanitizzaHtml('<img src="/x.png" width="999999" height="240">');

    expect(risultato).not.toContain("width=");
    expect(risultato).toContain('height="240"');
  });

  // Story 19.14 (Epic 19, Ruolo Site Manager): editor a blocchi - blocco
  // Video. L'allowlist iframe (allowedIframeHostnames) e' il vero cancello
  // sull'host; il sandbox forzato e la ri-validazione di
  // data-platform/data-video-id sono difesa in profondita' aggiuntiva.
  it("mantiene un iframe video su un hostname consentito (youtube-nocookie.com) e forza il sandbox", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" data-platform="youtube" data-video-id="dQw4w9WgXcQ" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>'
    );

    expect(risultato).toContain("<iframe");
    expect(risultato).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(risultato).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"');
    expect(risultato).toContain('data-platform="youtube"');
    expect(risultato).toContain('data-video-id="dQw4w9WgXcQ"');
  });

  it("mantiene un iframe video su player.vimeo.com", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" data-platform="vimeo" data-video-id="123456789" src="https://player.vimeo.com/video/123456789"></iframe>'
    );

    expect(risultato).toContain('src="https://player.vimeo.com/video/123456789"');
  });

  // sanitize-html (allowedIframeHostnames) rimuove solo l'attributo src
  // quando l'hostname non e' tra quelli consentiti - il tag <iframe> stesso
  // resta (e' comunque un tag allowlistato), ma senza src non incorpora
  // nulla: nessun URL/dominio arbitrario trapela mai nell'HTML pubblicato,
  // che e' la garanzia reale richiesta dalla spec (mai un <iframe src> con
  // URL letto direttamente dall'utente).
  it("rimuove il src di un iframe con un hostname non consentito, senza lasciarlo trapelare (manomissione/embed generico)", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" src="https://malintenzionato.example/embed"></iframe>'
    );

    expect(risultato).not.toContain("malintenzionato");
    expect(risultato).not.toContain("src=");
  });

  it("forza sempre lo stesso sandbox su un iframe video, anche se il valore persistito e' diverso (manomissione)", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" data-platform="youtube" data-video-id="dQw4w9WgXcQ" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" sandbox="allow-scripts allow-forms allow-top-navigation"></iframe>'
    );

    expect(risultato).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"');
    expect(risultato).not.toContain("allow-forms");
    expect(risultato).not.toContain("allow-top-navigation");
  });

  // Review fix (Blind Hunter, Story 19.14): validare data-platform/
  // data-video-id per formato e l'hostname di src separatamente non bastava -
  // un contenutoHtml manomesso poteva avere entrambi validi ma un src che
  // punta a un video DIVERSO sullo stesso hostname consentito (mai
  // verificato che src corrisponda davvero alla coppia platform/videoId). Ora
  // src viene sempre ricalcolato da quella coppia, mai fidato dal valore
  // persistito.
  it("ricalcola sempre src dalla coppia platform/videoId, anche se il src persistito punta a un altro video (manomissione)", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" data-platform="youtube" data-video-id="dQw4w9WgXcQ" src="https://www.youtube-nocookie.com/embed/UNALTROID999"></iframe>'
    );

    expect(risultato).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(risultato).not.toContain("UNALTROID999");
  });

  it("rimuove data-platform/data-video-id quando l'id non e' riconosciuto per la piattaforma dichiarata (manomissione)", () => {
    const risultato = sanitizzaHtml(
      '<iframe data-blocco="video" data-platform="youtube" data-video-id="<script>" src="https://www.youtube-nocookie.com/embed/x"></iframe>'
    );

    expect(risultato).not.toContain("data-platform");
    expect(risultato).not.toContain("data-video-id");
    // Il tag/src restano (stesso comportamento gia' testato per
    // data-align/width-height: si rimuove l'attributo manomesso, non
    // l'intero tag) - il vero cancello sull'host resta
    // allowedIframeHostnames sopra.
    expect(risultato).toContain("<iframe");
  });

  // Story 19.14: blocco Colonne - due colonne fisse, nessun tag nuovo per il
  // testo/immagine al loro interno (solo <div data-blocco="colonne/colonna">
  // in piu' intorno ai tag gia' allowlistati).
  it("mantiene il markup del blocco Colonne (contenitore + 2 colonne con testo/immagine)", () => {
    const html =
      '<div data-blocco="colonne">' +
      '<div data-blocco="colonna"><p>Testo colonna 1</p></div>' +
      '<div data-blocco="colonna"><img src="/x.png" alt=""></div>' +
      "</div>";

    const risultato = sanitizzaHtml(html);

    expect(risultato).toContain('data-blocco="colonne"');
    expect(risultato).toContain('data-blocco="colonna"');
    expect(risultato).toContain("<p>Testo colonna 1</p>");
    expect(risultato).toContain('src="/x.png"');
  });

  it('rimuove un data-blocco non valido su <div> (manomissione, insieme chiuso "colonne"/"colonna")', () => {
    const risultato = sanitizzaHtml('<div data-blocco="qualcosaltro"><p>Testo</p></div>');

    expect(risultato).not.toContain("data-blocco");
    expect(risultato).toContain("<p>Testo</p>");
  });

  // Story 19.14: blocco Pulsante - riusa <a> gia' allowlistato, nessun tag
  // nuovo aggiunto solo per questo blocco.
  it('mantiene data-blocco="pulsante" su un link (blocco Pulsante)', () => {
    const risultato = sanitizzaHtml('<a href="/squadre" data-blocco="pulsante">Vai</a>');

    expect(risultato).toContain('data-blocco="pulsante"');
    expect(risultato).toContain('href="/squadre"');
  });

  it('rimuove un data-blocco non valido su <a> (manomissione, insieme chiuso "pulsante")', () => {
    const risultato = sanitizzaHtml('<a href="/squadre" data-blocco="qualcosaltro">Vai</a>');

    expect(risultato).not.toContain("data-blocco");
    expect(risultato).toContain('href="/squadre"');
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

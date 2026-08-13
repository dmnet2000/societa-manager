import { describe, expect, it } from "vitest";
import { costruisciLinkPaginaFacebookIncorporata } from "./embed-facebook";

describe("costruisciLinkPaginaFacebookIncorporata", () => {
  it("punta al Page Plugin ufficiale di Facebook con l'href url-encodato (AC #2)", () => {
    const url = costruisciLinkPaginaFacebookIncorporata(
      "https://www.facebook.com/miasocieta"
    );

    expect(url.startsWith("https://www.facebook.com/plugins/page.php?")).toBe(true);
    expect(url).toContain(
      `href=${encodeURIComponent("https://www.facebook.com/miasocieta")}`
    );
    expect(url).toContain("tabs=timeline");
  });

  it("url-encoda correttamente caratteri speciali nell'URL della Pagina", () => {
    const urlPagina = "https://www.facebook.com/mia società?ref=1";

    const url = costruisciLinkPaginaFacebookIncorporata(urlPagina);

    expect(url).toContain(`href=${encodeURIComponent(urlPagina)}`);
    expect(url).not.toContain(" ");
  });
});

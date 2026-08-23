import { describe, expect, it } from "vitest";
import { costruisciSrcVideo, estraiIdVideo, videoIdRiconosciuto } from "./video-embed";

// Story 19.14 (Epic 19, Ruolo Site Manager): estraiIdVideo() e' il punto in
// cui un URL "umano" incollato dall'Utente viene interpretato - nessun input
// utente deve mai finire direttamente nell'src di un iframe pubblicato
// (Suggested Review Order della spec). Questi test coprono i pattern
// riconosciuti/non riconosciuti per entrambe le piattaforme.
describe("estraiIdVideo", () => {
  it("riconosce un URL YouTube in formato watch?v=", () => {
    expect(estraiIdVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      piattaforma: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("riconosce un URL YouTube senza www", () => {
    expect(estraiIdVideo("https://youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      piattaforma: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("riconosce un URL youtu.be abbreviato", () => {
    expect(estraiIdVideo("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      piattaforma: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("riconosce un URL Vimeo", () => {
    expect(estraiIdVideo("https://vimeo.com/123456789")).toEqual({
      piattaforma: "vimeo",
      id: "123456789",
    });
  });

  it("ignora parametri aggiuntivi nella query string di un URL YouTube", () => {
    expect(estraiIdVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toEqual({
      piattaforma: "youtube",
      id: "dQw4w9WgXcQ",
    });
  });

  it("rifiuta un host non riconosciuto", () => {
    expect(estraiIdVideo("https://esempio.it/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("rifiuta un URL YouTube senza il parametro v", () => {
    expect(estraiIdVideo("https://www.youtube.com/watch")).toBeNull();
  });

  it("rifiuta un URL YouTube con un percorso diverso da /watch (es. /shorts/, /embed/)", () => {
    expect(estraiIdVideo("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBeNull();
    expect(estraiIdVideo("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBeNull();
  });

  it("rifiuta un id YouTube di lunghezza non valida", () => {
    expect(estraiIdVideo("https://youtu.be/troppo-corto")).toBeNull();
  });

  it("rifiuta un id Vimeo non numerico", () => {
    expect(estraiIdVideo("https://vimeo.com/non-un-numero")).toBeNull();
  });

  it("rifiuta un protocollo diverso da http/https", () => {
    expect(estraiIdVideo("javascript:alert(1)")).toBeNull();
  });

  it("rifiuta una stringa che non e' un URL valido", () => {
    expect(estraiIdVideo("non e' un url")).toBeNull();
  });

  it("rifiuta una stringa vuota", () => {
    expect(estraiIdVideo("")).toBeNull();
    expect(estraiIdVideo("   ")).toBeNull();
  });
});

describe("videoIdRiconosciuto", () => {
  it("accetta un id YouTube valido", () => {
    expect(videoIdRiconosciuto("youtube", "dQw4w9WgXcQ")).toBe(true);
  });

  it("accetta un id Vimeo valido", () => {
    expect(videoIdRiconosciuto("vimeo", "123456789")).toBe(true);
  });

  it("rifiuta una piattaforma sconosciuta (manomissione)", () => {
    expect(videoIdRiconosciuto("dailymotion", "123456789")).toBe(false);
  });

  it("rifiuta un id malformato per la piattaforma dichiarata (manomissione)", () => {
    expect(videoIdRiconosciuto("youtube", "<script>")).toBe(false);
    expect(videoIdRiconosciuto("vimeo", "non-numerico")).toBe(false);
  });
});

describe("costruisciSrcVideo", () => {
  it("costruisce l'src YouTube sul dominio privacy-enhanced youtube-nocookie.com", () => {
    expect(costruisciSrcVideo("youtube", "dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("costruisce l'src Vimeo su player.vimeo.com", () => {
    expect(costruisciSrcVideo("vimeo", "123456789")).toBe(
      "https://player.vimeo.com/video/123456789"
    );
  });
});

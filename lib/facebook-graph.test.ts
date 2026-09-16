import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const adminClientFinto = { admin: "client" };
const createAdminClientMock = vi.fn(() => adminClientFinto);
vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

const leggiConfigurazioneSocialFacebookMock = vi.fn();
const aggiornaStatoLetturaFacebookMock = vi.fn();
vi.mock("@/lib/db-rls/configurazione-social-facebook", () => ({
  leggiConfigurazioneSocialFacebook: leggiConfigurazioneSocialFacebookMock,
  aggiornaStatoLetturaFacebook: aggiornaStatoLetturaFacebookMock,
}));

const { estraiSlugPaginaFacebook, estraiImmaginiPost, leggiUltimiPostFacebook } = await import(
  "./facebook-graph"
);

const configurazioneEsempio = {
  id: "c1",
  accessToken: "EAAG...segreto",
  ultimaLetturaOk: true,
  ultimoErrore: null,
};

function rispostaFetchFinta(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("estraiSlugPaginaFacebook", () => {
  it("estrae lo username da un URL senza slash finale", () => {
    expect(estraiSlugPaginaFacebook("https://www.facebook.com/miasocieta")).toBe(
      "miasocieta"
    );
  });

  it("estrae lo username da un URL con slash finale", () => {
    expect(estraiSlugPaginaFacebook("https://www.facebook.com/miasocieta/")).toBe(
      "miasocieta"
    );
  });

  it("restituisce null per un URL senza path", () => {
    expect(estraiSlugPaginaFacebook("https://www.facebook.com")).toBeNull();
    expect(estraiSlugPaginaFacebook("https://www.facebook.com/")).toBeNull();
  });

  it("restituisce null per un URL non parsabile", () => {
    expect(estraiSlugPaginaFacebook("non-un-url")).toBeNull();
  });

  it("limite noto: restituisce il primo segmento anche per URL /pages/Nome/id", () => {
    expect(
      estraiSlugPaginaFacebook("https://www.facebook.com/pages/Nome/12345")
    ).toBe("pages");
  });
});

describe("estraiImmaginiPost", () => {
  it("estrae la singola foto di un post type 'photo'", () => {
    const attachment = {
      type: "photo",
      media: { image: { src: "https://img.example/foto.jpg" } },
    };
    expect(estraiImmaginiPost(attachment, undefined)).toEqual([
      "https://img.example/foto.jpg",
    ]);
  });

  it("estrae tutte le foto di un post type 'album' dalle subattachments", () => {
    const attachment = {
      type: "album",
      subattachments: {
        data: [
          { media: { image: { src: "https://img.example/1.jpg" } } },
          { media: { image: { src: "https://img.example/2.jpg" } } },
          { media: { image: { src: "https://img.example/3.jpg" } } },
        ],
      },
    };
    expect(estraiImmaginiPost(attachment, undefined)).toEqual([
      "https://img.example/1.jpg",
      "https://img.example/2.jpg",
      "https://img.example/3.jpg",
    ]);
  });

  it("scarta silenziosamente le subattachments senza src valido, tiene le altre", () => {
    const attachment = {
      type: "album",
      subattachments: {
        data: [
          { media: { image: { src: "https://img.example/1.jpg" } } },
          { media: { image: {} } },
          { media: undefined },
          { media: { image: { src: "https://img.example/3.jpg" } } },
        ],
      },
    };
    expect(estraiImmaginiPost(attachment, undefined)).toEqual([
      "https://img.example/1.jpg",
      "https://img.example/3.jpg",
    ]);
  });

  it("fallback su full_picture quando l'attachment e' assente", () => {
    expect(estraiImmaginiPost(undefined, "https://img.example/full.jpg")).toEqual([
      "https://img.example/full.jpg",
    ]);
  });

  it("array vuoto quando l'attachment e' assente e full_picture manca (es. post di solo testo)", () => {
    expect(estraiImmaginiPost(undefined, undefined)).toEqual([]);
  });

  it("fallback su full_picture per un type non fotografico (es. 'video' o 'share')", () => {
    const attachment = { type: "video" };
    expect(estraiImmaginiPost(attachment, "https://img.example/full.jpg")).toEqual([
      "https://img.example/full.jpg",
    ]);
  });

  it("fallback su full_picture quando un post 'album' non ha subattachments con src valido", () => {
    const attachment = {
      type: "album",
      subattachments: { data: [{ media: { image: {} } }] },
    };
    expect(estraiImmaginiPost(attachment, "https://img.example/full.jpg")).toEqual([
      "https://img.example/full.jpg",
    ]);
  });

  it("fallback su full_picture quando un post 'photo' non ha media.image.src", () => {
    const attachment = { type: "photo", media: {} };
    expect(estraiImmaginiPost(attachment, "https://img.example/full.jpg")).toEqual([
      "https://img.example/full.jpg",
    ]);
  });

  it("fallback su full_picture (invece di lanciare) quando subattachments.data non e' un array", () => {
    const attachment = {
      type: "album",
      subattachments: { data: "non-un-array" as unknown as never },
    };
    expect(() =>
      estraiImmaginiPost(attachment, "https://img.example/full.jpg")
    ).not.toThrow();
    expect(estraiImmaginiPost(attachment, "https://img.example/full.jpg")).toEqual([
      "https://img.example/full.jpg",
    ]);
  });
});

describe("leggiUltimiPostFacebook", () => {
  beforeEach(() => {
    createAdminClientMock.mockClear();
    leggiConfigurazioneSocialFacebookMock.mockReset();
    aggiornaStatoLetturaFacebookMock.mockReset();
    aggiornaStatoLetturaFacebookMock.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("non chiama fetch e restituisce [] quando nessuna configurazione esiste", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(null);

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("legge la configurazione col client service-role, non con una sessione utente (AC #4)", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockResolvedValue(rispostaFetchFinta({ data: [] }));

    await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(createAdminClientMock).toHaveBeenCalled();
    expect(leggiConfigurazioneSocialFacebookMock).toHaveBeenCalledWith(adminClientFinto);
  });

  it("restituisce [] quando accessToken è una stringa vuota", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue({
      ...configurazioneEsempio,
      accessToken: "",
    });

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("restituisce [] quando urlPaginaFacebook non produce uno slug valido", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com");

    expect(risultato).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("mappa i post con testo e scarta quelli senza message (AC #1)", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockResolvedValue(
      rispostaFetchFinta({
        data: [
          {
            id: "p1",
            message: "Ciao a tutti!",
            full_picture: "https://img.example/1.jpg",
            permalink_url: "https://facebook.com/p1",
            created_time: "2026-08-10T10:00:00+0000",
          },
          { id: "p2", full_picture: "https://img.example/2.jpg" },
          { id: "p3", message: "Solo testo, nessuna immagine" },
        ],
      })
    );

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([
      {
        id: "p1",
        messaggio: "Ciao a tutti!",
        immaginiUrl: ["https://img.example/1.jpg"],
        permalink: "https://facebook.com/p1",
        dataPubblicazione: "2026-08-10T10:00:00+0000",
      },
      {
        id: "p3",
        messaggio: "Solo testo, nessuna immagine",
        immaginiUrl: [],
        permalink: "",
        dataPubblicazione: "",
      },
    ]);
  });

  it("Story 18.32: mappa tutte le foto di un post 'album' in immaginiUrl", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockResolvedValue(
      rispostaFetchFinta({
        data: [
          {
            id: "p1",
            message: "Foto della trasferta!",
            full_picture: "https://img.example/copertina.jpg",
            permalink_url: "https://facebook.com/p1",
            created_time: "2026-08-10T10:00:00+0000",
            attachments: {
              data: [
                {
                  type: "album",
                  subattachments: {
                    data: [
                      { media: { image: { src: "https://img.example/1.jpg" } } },
                      { media: { image: { src: "https://img.example/2.jpg" } } },
                      { media: { image: { src: "https://img.example/3.jpg" } } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      })
    );

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([
      {
        id: "p1",
        messaggio: "Foto della trasferta!",
        immaginiUrl: [
          "https://img.example/1.jpg",
          "https://img.example/2.jpg",
          "https://img.example/3.jpg",
        ],
        permalink: "https://facebook.com/p1",
        dataPubblicazione: "2026-08-10T10:00:00+0000",
      },
    ]);
  });

  it("aggiorna lo stato a ok=true dopo una lettura riuscita", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockResolvedValue(rispostaFetchFinta({ data: [] }));

    await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(aggiornaStatoLetturaFacebookMock).toHaveBeenCalledWith(adminClientFinto, {
      ultimaLetturaOk: true,
      ultimoErrore: null,
    });
  });

  it("restituisce [] e aggiorna lo stato a ok=false quando la risposta HTTP non è ok", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockResolvedValue(
      rispostaFetchFinta({ error: { message: "Invalid OAuth access token" } }, false, 401)
    );

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([]);
    expect(aggiornaStatoLetturaFacebookMock).toHaveBeenCalledWith(adminClientFinto, {
      ultimaLetturaOk: false,
      ultimoErrore: "Invalid OAuth access token",
    });
  });

  it("restituisce [] e aggiorna lo stato a ok=false quando fetch rigetta (rete/timeout)", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));

    const risultato = await leggiUltimiPostFacebook("https://www.facebook.com/miasocieta");

    expect(risultato).toEqual([]);
    expect(aggiornaStatoLetturaFacebookMock).toHaveBeenCalledWith(adminClientFinto, {
      ultimaLetturaOk: false,
      ultimoErrore: "network error",
    });
  });

  it("non lancia mai, anche se aggiornaStatoLetturaFacebook fallisce (fail-soft su fail-soft)", async () => {
    leggiConfigurazioneSocialFacebookMock.mockResolvedValue(configurazioneEsempio);
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    aggiornaStatoLetturaFacebookMock.mockRejectedValue(new Error("scrittura fallita"));

    await expect(
      leggiUltimiPostFacebook("https://www.facebook.com/miasocieta")
    ).resolves.toEqual([]);
  });

  it("non lancia mai quando leggiConfigurazioneSocialFacebook fallisce", async () => {
    leggiConfigurazioneSocialFacebookMock.mockRejectedValue(new Error("db down"));

    await expect(
      leggiUltimiPostFacebook("https://www.facebook.com/miasocieta")
    ).resolves.toEqual([]);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

// actions.ts importa lib/storage/validazione-immagine.ts, che ha
// "server-only" in testa - stesso mock gia' stabilito in
// app/(sponsor)/sponsor/actions.test.ts.
vi.mock("server-only", () => ({}));

const requireRuoloMock = vi.fn();
const creaPaginaPubblicaMock = vi.fn();
const aggiornaPaginaPubblicaMock = vi.fn();
const eliminaPaginaPubblicaMock = vi.fn();
const trovaPaginaPubblicaPerIdMock = vi.fn();
const sanitizzaHtmlMock = vi.fn();
const createClientMock = vi.fn();
const caricaImmaginePaginaPubblicaMock = vi.fn();
const revalidatePathMock = vi.fn();
const invalidaCachePaginePubblicheMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/auth/pagine-pubbliche-slug-cache", () => ({
  invalidaCachePaginePubbliche: invalidaCachePaginePubblicheMock,
}));

vi.mock("@/lib/pagine-pubbliche", () => ({
  creaPaginaPubblica: creaPaginaPubblicaMock,
  aggiornaPaginaPubblica: aggiornaPaginaPubblicaMock,
  eliminaPaginaPubblica: eliminaPaginaPubblicaMock,
  trovaPaginaPubblicaPerId: trovaPaginaPubblicaPerIdMock,
}));

vi.mock("@/lib/sanitizza-html", () => ({
  sanitizzaHtml: sanitizzaHtmlMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/storage/pagine-pubbliche", () => ({
  caricaImmaginePaginaPubblica: caricaImmaginePaginaPubblicaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  creaPaginaPubblicaAction,
  aggiornaPaginaPubblicaAction,
  eliminaPaginaPubblicaAction,
  caricaImmaginePaginaAction,
  validaUrlVideoAction,
} = await import("./actions");

const supabaseFinto = { finto: true };

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function fileValido(nome = "immagine.png", tipo = "image/png", dimensione = 1024) {
  const bytes = new Uint8Array(dimensione);
  const magic = MAGIC_BYTES[tipo];
  if (magic && dimensione >= magic.length) bytes.set(magic, 0);
  return new File([bytes], nome, { type: tipo });
}

function buildFormData(fields: Record<string, string> = {}, file?: File | null) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) formData.append("file", file);
  return formData;
}

function campiValidi() {
  return {
    titolo: "Chi siamo",
    slug: "/chi-siamo",
    contenutoHtml: "<p>Testo</p>",
  };
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  creaPaginaPubblicaMock.mockReset();
  creaPaginaPubblicaMock.mockResolvedValue({ id: "pagina-1" });
  aggiornaPaginaPubblicaMock.mockReset();
  aggiornaPaginaPubblicaMock.mockResolvedValue(undefined);
  eliminaPaginaPubblicaMock.mockReset();
  eliminaPaginaPubblicaMock.mockResolvedValue(undefined);
  trovaPaginaPubblicaPerIdMock.mockReset();
  trovaPaginaPubblicaPerIdMock.mockResolvedValue(null);
  sanitizzaHtmlMock.mockReset();
  sanitizzaHtmlMock.mockImplementation((html: string) => `sanitizzato:${html}`);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  caricaImmaginePaginaPubblicaMock.mockReset();
  caricaImmaginePaginaPubblicaMock.mockResolvedValue("https://esempio.it/immagine.png");
  revalidatePathMock.mockReset();
  invalidaCachePaginePubblicheMock.mockReset();
});

describe("creaPaginaPubblicaAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("crea la Pagina con il contenuto sanitizzato e revalida /app/pagine-pubbliche", async () => {
    const result = await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({ success: true });
    expect(sanitizzaHtmlMock).toHaveBeenCalledWith("<p>Testo</p>");
    expect(creaPaginaPubblicaMock).toHaveBeenCalledWith({
      titolo: "Chi siamo",
      slug: "/chi-siamo",
      contenutoHtml: "sanitizzato:<p>Testo</p>",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/pagine-pubbliche");
  });

  it("applica il trim ai campi", async () => {
    await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), titolo: "  Chi siamo  ", slug: "  /chi-siamo  " })
    );

    expect(creaPaginaPubblicaMock).toHaveBeenCalledWith(
      expect.objectContaining({ titolo: "Chi siamo", slug: "/chi-siamo" })
    );
  });

  it("returns VALIDATION se il titolo e' vuoto", async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), titolo: "  " })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il titolo è obbligatorio." },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION oltre i 100 caratteri di titolo", async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), titolo: "x".repeat(101) })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il titolo supera i 100 caratteri." },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it('returns VALIDATION per uno slug che non inizia con "/"', async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), slug: "chi-siamo" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it('returns VALIDATION per uno slug protocol-relative ("//...")', async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), slug: "//esempio-esterno.it" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it('returns VALIDATION per uno slug riservato ("/app")', async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), slug: "/app" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it('returns VALIDATION per uno slug riservato sotto "/api/*"', async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), slug: "/api/health" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it('returns VALIDATION per lo slug di una pagina pubblica esistente ("/squadre")', async () => {
    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), slug: "/squadre" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se il contenuto e' vuoto", async () => {
    sanitizzaHtmlMock.mockReturnValue("");

    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), contenutoHtml: "  " })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il contenuto della pagina è obbligatorio." },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  // Code review (Blind Hunter + Edge Case Hunter, trovato indipendentemente
  // da entrambi): un editor Tiptap mai toccato/svuotato del tutto serializza
  // a "<p></p>" - una stringa non vuota che superava il vecchio controllo
  // `!campi.contenutoHtml`. Il contenuto sanitizzato viene ora confrontato
  // senza i tag: "<p></p>" non ha testo visibile, va rifiutato.
  it("returns VALIDATION quando il contenuto sanitizzato e' il markup vuoto di Tiptap (\"<p></p>\")", async () => {
    sanitizzaHtmlMock.mockReturnValue("<p></p>");

    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), contenutoHtml: "<p></p>" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il contenuto della pagina è obbligatorio." },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  // Un'immagine da sola (nessun testo) conta comunque come contenuto reale -
  // non basta "nessun testo visibile", va guardato anche un tag <img>.
  it("accetta un contenuto sanitizzato con solo un'immagine, nessun testo visibile", async () => {
    sanitizzaHtmlMock.mockReturnValue('<p><img src="/x.png"></p>');

    const result = await creaPaginaPubblicaAction(
      undefined,
      buildFormData({ ...campiValidi(), contenutoHtml: '<p><img src="/x.png"></p>' })
    );

    expect(result).toEqual({ success: true });
    expect(creaPaginaPubblicaMock).toHaveBeenCalled();
  });

  it("returns VALIDATION quando il contenuto sanitizzato supera 200.000 caratteri", async () => {
    sanitizzaHtmlMock.mockReturnValue(`<p>${"x".repeat(200_001)}</p>`);

    const result = await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto supera i 200.000 caratteri.",
      },
    });
    expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  // Code review (Blind Hunter): senza questo, il Proxy continuerebbe a
  // fidarsi della cache edge-safe (TTL 90s, Story 19.9) e una Pagina appena
  // creata resterebbe non raggiungibile per un Visitatore anonimo, in
  // contraddizione con "subito visibile pubblicamente" mostrato in UI.
  it("invalida la cache dello slug al successo", async () => {
    await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(invalidaCachePaginePubblicheMock).toHaveBeenCalled();
  });

  it("returns VALIDATION quando lo slug e' gia' in uso (vincolo @unique, P2002)", async () => {
    creaPaginaPubblicaMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const result = await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo URL è già utilizzato da un'altra Pagina." },
    });
  });

  it("returns INTERNAL fail-closed quando creaPaginaPubblica lancia un errore generico", async () => {
    creaPaginaPubblicaMock.mockRejectedValue(new Error("db down"));

    const result = await creaPaginaPubblicaAction(undefined, buildFormData(campiValidi()));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare la Pagina. Riprova." },
    });
  });

  // Story 19.14 (Epic 19, Ruolo Site Manager): editor a blocchi - il blocco
  // Pulsante/Video e' gia' validato lato client prima dell'inserimento, ma
  // il vero cancello e' qui: un campo hidden manomesso (contenutoHtml con un
  // blocco Pulsante/Video invalido scritto a mano) deve comunque essere
  // rifiutato al salvataggio (Boundaries "Always" della spec).
  describe("blocco Pulsante/Video (editor a blocchi, Story 19.14)", () => {
    it("returns VALIDATION quando il blocco Pulsante ha un href riservato (\"/app\")", async () => {
      const contenutoHtml = '<a href="/app" data-blocco="pulsante">Vai</a>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).',
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("accetta un blocco Pulsante con un href valido (rotta interna non riservata)", async () => {
      // "/squadre" e' una delle 5 pagine pubbliche gia' hardcoded (isPublicRoute)
      // ed e' quindi "riservata" per urlVoceMenuValido - stesso comportamento
      // gia' in uso per il menu pubblico (Story 19.9), riusato tal quale qui
      // (Boundaries "Always" della spec). Una PaginaPubblica creata dinamicamente
      // con questo slug invece non collide con isPublicRoute.
      const contenutoHtml = '<a href="/una-pagina-qualsiasi" data-blocco="pulsante">Vai</a>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({ success: true });
      expect(creaPaginaPubblicaMock).toHaveBeenCalled();
    });

    it("accetta un blocco Pulsante con un href esterno http/https valido", async () => {
      const contenutoHtml = '<a href="https://esempio.it" data-blocco="pulsante">Vai</a>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({ success: true });
    });

    it("returns VALIDATION ('URL video non riconosciuto') quando il blocco Video ha un id non riconosciuto", async () => {
      const contenutoHtml =
        '<iframe data-blocco="video" data-platform="youtube" data-video-id="non-valido" src="https://www.youtube-nocookie.com/embed/x"></iframe>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: { code: "VALIDATION", message: "URL video non riconosciuto." },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("accetta un blocco Video con platform/id validi", async () => {
      const contenutoHtml =
        '<iframe data-blocco="video" data-platform="youtube" data-video-id="dQw4w9WgXcQ" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({ success: true });
    });
  });

  // Review fix (Verification Gap, Story 19.14): il blocco Colonne
  // (esattamente 2 colonne fisse, mai Video/Pulsante/Colonne annidate -
  // Boundaries "Always" della spec) era imposto SOLO dallo schema ProseMirror
  // lato client - un contenutoHtml manomesso (campo hidden, bypassa
  // l'editor) doveva restare rifiutato al salvataggio, non solo lato UI.
  describe("blocco Colonne (editor a blocchi, Story 19.14)", () => {
    it("accetta un blocco Colonne valido (esattamente 2 colonne dirette)", async () => {
      const contenutoHtml =
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna"><p>Testo colonna 1</p></div>' +
        '<div data-blocco="colonna"><img src="/x.png" alt=""></div>' +
        "</div>";
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({ success: true });
    });

    it("returns VALIDATION quando il blocco Colonne ha una sola colonna (manomissione)", async () => {
      const contenutoHtml =
        '<div data-blocco="colonne"><div data-blocco="colonna"><p>Sola</p></div></div>';
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Il blocco Colonne non è valido (deve avere esattamente 2 colonne, mai un altro blocco Colonne/Video/Pulsante annidato).",
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("returns VALIDATION quando il blocco Colonne ha tre colonne (manomissione)", async () => {
      const contenutoHtml =
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna"><p>Uno</p></div>' +
        '<div data-blocco="colonna"><p>Due</p></div>' +
        '<div data-blocco="colonna"><p>Tre</p></div>' +
        "</div>";
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Il blocco Colonne non è valido (deve avere esattamente 2 colonne, mai un altro blocco Colonne/Video/Pulsante annidato).",
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("returns VALIDATION quando una colonna contiene un altro blocco Colonne annidato (manomissione)", async () => {
      const contenutoHtml =
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna">' +
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna"><p>Interno 1</p></div>' +
        '<div data-blocco="colonna"><p>Interno 2</p></div>' +
        "</div>" +
        "</div>" +
        '<div data-blocco="colonna"><p>Due</p></div>' +
        "</div>";
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Il blocco Colonne non è valido (deve avere esattamente 2 colonne, mai un altro blocco Colonne/Video/Pulsante annidato).",
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("returns VALIDATION quando una colonna contiene un blocco Video annidato (manomissione)", async () => {
      const contenutoHtml =
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna">' +
        '<iframe data-blocco="video" data-platform="youtube" data-video-id="dQw4w9WgXcQ" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>' +
        "</div>" +
        '<div data-blocco="colonna"><p>Due</p></div>' +
        "</div>";
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Il blocco Colonne non è valido (deve avere esattamente 2 colonne, mai un altro blocco Colonne/Video/Pulsante annidato).",
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });

    it("returns VALIDATION quando una colonna contiene un blocco Pulsante annidato (manomissione)", async () => {
      // href non riservato (a differenza di "/squadre", una delle 5 pagine
      // pubbliche storiche) - qui interessa la struttura del blocco Colonne,
      // non la validazione dell'href del Pulsante annidato (gia' coperta
      // altrove), quindi l'href deve superare quel controllo indipendente
      // perche' il test isoli davvero il fallimento sulla struttura.
      const contenutoHtml =
        '<div data-blocco="colonne">' +
        '<div data-blocco="colonna"><a href="https://esempio.it" data-blocco="pulsante">Vai</a></div>' +
        '<div data-blocco="colonna"><p>Due</p></div>' +
        "</div>";
      sanitizzaHtmlMock.mockReturnValue(contenutoHtml);

      const result = await creaPaginaPubblicaAction(
        undefined,
        buildFormData({ ...campiValidi(), contenutoHtml })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Il blocco Colonne non è valido (deve avere esattamente 2 colonne, mai un altro blocco Colonne/Video/Pulsante annidato).",
        },
      });
      expect(creaPaginaPubblicaMock).not.toHaveBeenCalled();
    });
  });
});

describe("validaUrlVideoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await validaUrlVideoAction("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
  });

  it("returns piattaforma/videoId per un URL YouTube riconosciuto", async () => {
    const result = await validaUrlVideoAction("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(result).toEqual({ piattaforma: "youtube", videoId: "dQw4w9WgXcQ" });
  });

  it("returns piattaforma/videoId per un URL Vimeo riconosciuto", async () => {
    const result = await validaUrlVideoAction("https://vimeo.com/123456789");

    expect(result).toEqual({ piattaforma: "vimeo", videoId: "123456789" });
  });

  it("returns VALIDATION ('URL video non riconosciuto') per un URL non riconosciuto", async () => {
    const result = await validaUrlVideoAction("https://esempio.it/video");

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "URL video non riconosciuto." },
    });
  });
});

describe("aggiornaPaginaPubblicaAction", () => {
  function buildFormDataAggiorna(fields: Record<string, string> = {}) {
    return buildFormData({ id: "pagina-1", ...campiValidi(), ...fields });
  }

  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaPaginaPubblicaAction(undefined, buildFormDataAggiorna());

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(aggiornaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("aggiorna la Pagina by id con il contenuto sanitizzato e revalida /app/pagine-pubbliche", async () => {
    const result = await aggiornaPaginaPubblicaAction(undefined, buildFormDataAggiorna());

    expect(result).toEqual({ success: true });
    expect(aggiornaPaginaPubblicaMock).toHaveBeenCalledWith("pagina-1", {
      titolo: "Chi siamo",
      slug: "/chi-siamo",
      contenutoHtml: "sanitizzato:<p>Testo</p>",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/pagine-pubbliche");
  });

  it("returns VALIDATION invariata (stessa validazione della creazione)", async () => {
    const result = await aggiornaPaginaPubblicaAction(
      undefined,
      buildFormDataAggiorna({ titolo: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il titolo è obbligatorio." },
    });
    expect(aggiornaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  // Mirror del fix intent_gap gia' applicato a aggiornaVoceMenuPubblicoAction
  // (Story 19.9): risalvare la STESSA Pagina con lo stesso slug invariato
  // deve riuscire anche se quello slug e' "riservato" secondo rottaRiservata()
  // (isPublicRoute copre anche le Pagine pubbliche gia' esistenti).
  it("accetta la modifica quando lo slug inviato coincide con quello gia' salvato per la Pagina, anche se rottaRiservata() lo considera riservato", async () => {
    trovaPaginaPubblicaPerIdMock.mockResolvedValue({
      id: "pagina-1",
      titolo: "Squadre",
      slug: "/squadre",
      contenutoHtml: "<p>vecchio</p>",
    });

    const result = await aggiornaPaginaPubblicaAction(
      undefined,
      buildFormDataAggiorna({ titolo: "Le Nostre Squadre", slug: "/squadre" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaPaginaPubblicaMock).toHaveBeenCalledWith("pagina-1", {
      titolo: "Le Nostre Squadre",
      slug: "/squadre",
      contenutoHtml: "sanitizzato:<p>Testo</p>",
    });
  });

  it("returns VALIDATION se lo slug viene cambiato verso un nuovo slug riservato in modifica", async () => {
    trovaPaginaPubblicaPerIdMock.mockResolvedValue({
      id: "pagina-1",
      titolo: "Squadre",
      slug: "/squadre",
      contenutoHtml: "<p>vecchio</p>",
    });

    const result = await aggiornaPaginaPubblicaAction(
      undefined,
      buildFormDataAggiorna({ slug: "/app" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" e non può corrispondere a una rotta riservata del sito).',
      },
    });
    expect(aggiornaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il nuovo slug e' gia' in uso da un'altra Pagina (P2002)", async () => {
    aggiornaPaginaPubblicaMock.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const result = await aggiornaPaginaPubblicaAction(undefined, buildFormDataAggiorna());

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Questo URL è già utilizzato da un'altra Pagina." },
    });
  });

  it("returns INTERNAL fail-closed quando aggiornaPaginaPubblica lancia un errore generico", async () => {
    aggiornaPaginaPubblicaMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaPaginaPubblicaAction(undefined, buildFormDataAggiorna());

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Pagina. Riprova." },
    });
  });

  // Code review (Verification Gap): prima di questo fix, un errore DB nel
  // lookup di trovaPaginaPubblicaPerId veniva mascherato da un "null"
  // silenzioso (.catch), quindi slugAttuale diventava undefined e un
  // salvataggio perfettamente valido (stesso slug di sempre) veniva
  // rifiutato con un fuorviante "URL non valido" invece di un onesto errore
  // di sistema. Ora l'errore propaga fino a un INTERNAL esplicito.
  it("returns INTERNAL (non VALIDATION) quando trovaPaginaPubblicaPerId lancia durante la modifica", async () => {
    trovaPaginaPubblicaPerIdMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaPaginaPubblicaAction(
      undefined,
      buildFormDataAggiorna({ slug: "/squadre" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Pagina. Riprova." },
    });
    expect(aggiornaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("invalida la cache dello slug al successo", async () => {
    await aggiornaPaginaPubblicaAction(undefined, buildFormDataAggiorna());

    expect(invalidaCachePaginePubblicheMock).toHaveBeenCalled();
  });
});

describe("eliminaPaginaPubblicaAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await eliminaPaginaPubblicaAction(
      undefined,
      buildFormData({ id: "pagina-1" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(eliminaPaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("elimina la Pagina by id e revalida /app/pagine-pubbliche", async () => {
    const result = await eliminaPaginaPubblicaAction(
      undefined,
      buildFormData({ id: "pagina-1" })
    );

    expect(result).toEqual({ success: true });
    expect(eliminaPaginaPubblicaMock).toHaveBeenCalledWith("pagina-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/pagine-pubbliche");
    // Code review (Blind Hunter): senza questo, una Pagina appena eliminata
    // resterebbe considerata "esistente" dalla cache edge-safe del Proxy
    // fino alla scadenza naturale del TTL.
    expect(invalidaCachePaginePubblicheMock).toHaveBeenCalled();
  });

  it("treats a P2025 (already deleted) as idempotent success", async () => {
    eliminaPaginaPubblicaMock.mockRejectedValue(
      Object.assign(new Error("Record to delete does not exist"), { code: "P2025" })
    );

    const result = await eliminaPaginaPubblicaAction(
      undefined,
      buildFormData({ id: "pagina-1" })
    );

    expect(result).toEqual({ success: true });
    expect(invalidaCachePaginePubblicheMock).toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando eliminaPaginaPubblica lancia un errore generico", async () => {
    eliminaPaginaPubblicaMock.mockRejectedValue(new Error("db down"));

    const result = await eliminaPaginaPubblicaAction(
      undefined,
      buildFormData({ id: "pagina-1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile eliminare la Pagina. Riprova." },
    });
  });
});

describe("caricaImmaginePaginaAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await caricaImmaginePaginaAction(buildFormData({}, fileValido()));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(caricaImmaginePaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando nessun file e' fornito", async () => {
    const result = await caricaImmaginePaginaAction(buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona un'immagine da caricare." },
    });
    expect(caricaImmaginePaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un tipo MIME non ammesso", async () => {
    const result = await caricaImmaginePaginaAction(
      buildFormData({}, fileValido("immagine.svg", "image/svg+xml"))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato immagine non ammesso (solo PNG, JPG)." },
    });
    expect(caricaImmaginePaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il file supera i 2MB", async () => {
    const result = await caricaImmaginePaginaAction(
      buildFormData({}, fileValido("immagine.png", "image/png", 2 * 1024 * 1024 + 1))
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il file supera la dimensione massima di 2MB." },
    });
    expect(caricaImmaginePaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando le magic byte non corrispondono al MIME dichiarato", async () => {
    const fileIngannevole = new File([new Uint8Array(1024)], "falso.png", {
      type: "image/png",
    });

    const result = await caricaImmaginePaginaAction(buildFormData({}, fileIngannevole));

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il contenuto del file non corrisponde al formato dichiarato.",
      },
    });
    expect(caricaImmaginePaginaPubblicaMock).not.toHaveBeenCalled();
  });

  it("carica l'immagine e restituisce l'URL pubblico", async () => {
    const file = fileValido();
    const result = await caricaImmaginePaginaAction(buildFormData({}, file));

    expect(result).toEqual({ url: "https://esempio.it/immagine.png" });
    expect(caricaImmaginePaginaPubblicaMock).toHaveBeenCalledWith(supabaseFinto, file);
  });

  it("returns INTERNAL fail-closed quando l'upload fallisce", async () => {
    caricaImmaginePaginaPubblicaMock.mockRejectedValue(new Error("storage down"));

    const result = await caricaImmaginePaginaAction(buildFormData({}, fileValido()));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile caricare l'immagine. Riprova." },
    });
  });
});

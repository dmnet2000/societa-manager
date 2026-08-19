import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const elencaVociMenuPubblicoMock = vi.fn();
const elencaVociMenuPubblicoVisibiliMock = vi.fn();
const creaVoceMenuPubblicoMock = vi.fn();
const aggiornaVoceMenuPubblicoMock = vi.fn();
const impostaVisibileVoceMenuPubblicoMock = vi.fn();
const riordinaVociMenuPubblicoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/menu-pubblico", () => ({
  elencaVociMenuPubblico: elencaVociMenuPubblicoMock,
  elencaVociMenuPubblicoVisibili: elencaVociMenuPubblicoVisibiliMock,
  creaVoceMenuPubblico: creaVoceMenuPubblicoMock,
  aggiornaVoceMenuPubblico: aggiornaVoceMenuPubblicoMock,
  impostaVisibileVoceMenuPubblico: impostaVisibileVoceMenuPubblicoMock,
  riordinaVociMenuPubblico: riordinaVociMenuPubblicoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  creaVoceMenuPubblicoAction,
  aggiornaVoceMenuPubblicoAction,
  impostaVisibileVoceMenuPubblicoAction,
  spostaVoceMenuPubblicoAction,
} = await import("./actions");

function buildFormData(fields: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function vociFinte() {
  return [
    { id: "a", etichetta: "Home", url: "/", ordine: 0, visibile: true },
    { id: "b", etichetta: "Squadre", url: "/squadre", ordine: 1, visibile: true },
    { id: "c", etichetta: "Contatti", url: "/contatti", ordine: 2, visibile: true },
  ];
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  elencaVociMenuPubblicoMock.mockReset();
  elencaVociMenuPubblicoMock.mockResolvedValue(vociFinte());
  elencaVociMenuPubblicoVisibiliMock.mockReset();
  elencaVociMenuPubblicoVisibiliMock.mockResolvedValue(vociFinte());
  creaVoceMenuPubblicoMock.mockReset();
  creaVoceMenuPubblicoMock.mockResolvedValue(undefined);
  aggiornaVoceMenuPubblicoMock.mockReset();
  aggiornaVoceMenuPubblicoMock.mockResolvedValue(undefined);
  impostaVisibileVoceMenuPubblicoMock.mockReset();
  impostaVisibileVoceMenuPubblicoMock.mockResolvedValue(undefined);
  riordinaVociMenuPubblicoMock.mockReset();
  riordinaVociMenuPubblicoMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("creaVoceMenuPubblicoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Foo", url: "/foo" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("crea la voce (trim applicato) e revalida /app/menu-pubblico", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "  Foo  ", url: "  /foo  " })
    );

    expect(result).toEqual({ success: true });
    expect(creaVoceMenuPubblicoMock).toHaveBeenCalledWith({
      etichetta: "Foo",
      url: "/foo",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/menu-pubblico");
  });

  it("accepts un URL esterno http/https", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Federazione", url: "https://www.federvolley.it" })
    );

    expect(result).toEqual({ success: true });
    expect(creaVoceMenuPubblicoMock).toHaveBeenCalledWith({
      etichetta: "Federazione",
      url: "https://www.federvolley.it",
    });
  });

  it("returns VALIDATION se l'etichetta e' vuota", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "  ", url: "/foo" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'etichetta è obbligatoria." },
    });
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION oltre i 40 caratteri di etichetta", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "x".repeat(41), url: "/foo" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'etichetta supera i 40 caratteri." },
    });
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un URL che non inizia con \"/\" ne' http/https", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Foo", url: "javascript:alert(1)" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).',
      },
    });
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  // Review fix: "//host.esterno" inizia con "/" ma e' un URL
  // protocol-relative - il browser/Next Link lo risolve come navigazione
  // assoluta verso un altro dominio, non una rotta interna del sito.
  it('returns VALIDATION per un URL protocol-relative ("//...")', async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Foo", url: "//esempio-esterno.it" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).',
      },
    });
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un URL vuoto", async () => {
    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Foo", url: "  " })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          'URL non valido (deve iniziare con "/" per una pagina del sito, oppure con http:// o https:// per un link esterno).',
      },
    });
    expect(creaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando creaVoceMenuPubblico lancia", async () => {
    creaVoceMenuPubblicoMock.mockRejectedValue(new Error("db down"));

    const result = await creaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ etichetta: "Foo", url: "/foo" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare la voce di menu. Riprova." },
    });
  });
});

describe("aggiornaVoceMenuPubblicoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", etichetta: "Foo", url: "/foo" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(aggiornaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("aggiorna la voce by id e revalida /app/menu-pubblico", async () => {
    const result = await aggiornaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", etichetta: "Nuovo nome", url: "/nuovo" })
    );

    expect(result).toEqual({ success: true });
    expect(aggiornaVoceMenuPubblicoMock).toHaveBeenCalledWith("a", {
      etichetta: "Nuovo nome",
      url: "/nuovo",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/menu-pubblico");
  });

  it("returns VALIDATION invariata (stessa validazione della creazione)", async () => {
    const result = await aggiornaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", etichetta: "", url: "/foo" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'etichetta è obbligatoria." },
    });
    expect(aggiornaVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando aggiornaVoceMenuPubblico lancia", async () => {
    aggiornaVoceMenuPubblicoMock.mockRejectedValue(new Error("db down"));

    const result = await aggiornaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", etichetta: "Foo", url: "/foo" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la voce di menu. Riprova." },
    });
  });
});

describe("impostaVisibileVoceMenuPubblicoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "false" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(impostaVisibileVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("nasconde una voce visibile quando ne restano altre visibili", async () => {
    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "false" })
    );

    expect(result).toEqual({ success: true });
    expect(impostaVisibileVoceMenuPubblicoMock).toHaveBeenCalledWith("a", false);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/menu-pubblico");
  });

  // Review fix: senza questo guard, nascondere l'ultima voce visibile
  // svuota elencaVociMenuPubblicoVisibili() - NavPubblica.tsx (Story 19.8)
  // tratta questo come un errore bloccante (nessun fallback silenzioso),
  // quindi l'intero sito pubblico smetterebbe di renderizzare.
  it("returns VALIDATION se si tenta di nascondere l'unica voce visibile rimasta", async () => {
    elencaVociMenuPubblicoVisibiliMock.mockResolvedValue([
      { id: "a", etichetta: "Home", url: "/", ordine: 0, visibile: true },
    ]);

    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "false" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Non puoi nascondere l'ultima voce visibile: il menu del sito pubblico deve avere sempre almeno una voce.",
      },
    });
    expect(impostaVisibileVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("non chiama la verifica delle voci visibili quando si sta mostrando (non nascondendo)", async () => {
    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "true" })
    );

    expect(result).toEqual({ success: true });
    expect(elencaVociMenuPubblicoVisibiliMock).not.toHaveBeenCalled();
  });

  it("mostra una voce nascosta", async () => {
    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "true" })
    );

    expect(result).toEqual({ success: true });
    expect(impostaVisibileVoceMenuPubblicoMock).toHaveBeenCalledWith("a", true);
  });

  // Review fix gia' applicato al mirror (impostaAttivaSponsor, Story 16.1):
  // un valore mancante/malformato non deve essere trattato come "false"
  // silenziosamente.
  it("returns VALIDATION per un valore di visibile mancante/malformato", async () => {
    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Valore di visibilità non valido." },
    });
    expect(impostaVisibileVoceMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando impostaVisibileVoceMenuPubblico lancia", async () => {
    impostaVisibileVoceMenuPubblicoMock.mockRejectedValue(new Error("db down"));

    const result = await impostaVisibileVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", visibile: "true" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della voce. Riprova.",
      },
    });
  });
});

describe("spostaVoceMenuPubblicoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(elencaVociMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per una direzione non valida", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "b", direzione: "laterale" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Direzione non valida." },
    });
    expect(elencaVociMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("scambia con la voce precedente su \"su\" e revalida /app/menu-pubblico", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaVociMenuPubblicoMock).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/menu-pubblico");
  });

  it("scambia con la voce successiva su \"giu\"", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "b", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaVociMenuPubblicoMock).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("e' un no-op (success) su \"su\" per la prima voce - nessuna scrittura", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "a", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaVociMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("e' un no-op (success) su \"giu\" per l'ultima voce - nessuna scrittura", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "c", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaVociMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se l'id non corrisponde a nessuna voce", async () => {
    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "inesistente", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Voce non trovata." },
    });
    expect(riordinaVociMenuPubblicoMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando riordinaVociMenuPubblico lancia", async () => {
    riordinaVociMenuPubblicoMock.mockRejectedValue(new Error("db down"));

    const result = await spostaVoceMenuPubblicoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile riordinare le voci. Riprova." },
    });
  });
});

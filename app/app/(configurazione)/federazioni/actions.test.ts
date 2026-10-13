import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const requireRuoloMock = vi.fn();
const elencaFederazioniMock = vi.fn();
const trovaFederazionePerNomeInsensitiveMock = vi.fn();
const creaFederazioneMock = vi.fn();
const aggiornaFederazioneMock = vi.fn();
const impostaAttivaFederazioneMock = vi.fn();
const riordinaFederazioniMock = vi.fn();
const eliminaFederazioneMock = vi.fn();
const federazioneInUsoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/federazioni", () => ({
  elencaFederazioni: elencaFederazioniMock,
  trovaFederazionePerNomeInsensitive: trovaFederazionePerNomeInsensitiveMock,
  creaFederazione: creaFederazioneMock,
  aggiornaFederazione: aggiornaFederazioneMock,
  impostaAttivaFederazione: impostaAttivaFederazioneMock,
  riordinaFederazioni: riordinaFederazioniMock,
  eliminaFederazione: eliminaFederazioneMock,
}));

vi.mock("@/lib/tesseramento", () => ({
  federazioneInUso: federazioneInUsoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  creaFederazioneAction,
  aggiornaFederazioneAction,
  impostaAttivaFederazioneAction,
  spostaFederazioneAction,
  eliminaFederazioneAction,
} = await import("./actions");

function buildFormData(fields: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function federazioniFinte() {
  return [
    { id: "a", nome: "FIPAV", sigla: "FIPAV", ordine: 0, attiva: true },
    { id: "b", nome: "Centro Sportivo Italiano", sigla: "CSI", ordine: 1, attiva: true },
    { id: "c", nome: "UISP", sigla: null, ordine: 2, attiva: false },
  ];
}

const FORBIDDEN = {
  error: { code: "FORBIDDEN", message: "Non hai i permessi per questa operazione." },
};

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  elencaFederazioniMock.mockReset();
  elencaFederazioniMock.mockResolvedValue(federazioniFinte());
  trovaFederazionePerNomeInsensitiveMock.mockReset();
  trovaFederazionePerNomeInsensitiveMock.mockResolvedValue(null);
  creaFederazioneMock.mockReset();
  creaFederazioneMock.mockResolvedValue(undefined);
  aggiornaFederazioneMock.mockReset();
  aggiornaFederazioneMock.mockResolvedValue(undefined);
  impostaAttivaFederazioneMock.mockReset();
  impostaAttivaFederazioneMock.mockResolvedValue(undefined);
  riordinaFederazioniMock.mockReset();
  riordinaFederazioniMock.mockResolvedValue(undefined);
  eliminaFederazioneMock.mockReset();
  eliminaFederazioneMock.mockResolvedValue(undefined);
  federazioneInUsoMock.mockReset();
  federazioneInUsoMock.mockResolvedValue(false);
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function silenziaConsoleError() {
  vi.spyOn(console, "error").mockImplementation(() => {});
}

function erroreConCodice(code: string) {
  return Object.assign(new Error(code), { code });
}

describe("normalizzazione e casi limite", () => {
  it("comprime gli spazi interni del nome", async () => {
    await creaFederazioneAction(undefined, buildFormData({ nome: " Centro   Sportivo  " }));
    expect(creaFederazioneMock).toHaveBeenCalledWith({ nome: "Centro Sportivo", sigla: null });
  });

  it("rifiuta un nome oltre 80 caratteri", async () => {
    const result = await creaFederazioneAction(undefined, buildFormData({ nome: "X".repeat(81) }));
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(creaFederazioneMock).not.toHaveBeenCalled();
  });

  it("P2002 in creazione (nome identico concorrente) diventa errore di duplicato", async () => {
    creaFederazioneMock.mockRejectedValue(erroreConCodice("P2002"));
    const result = await creaFederazioneAction(undefined, buildFormData({ nome: "CSI" }));
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Esiste già una federazione con questo nome." },
    });
  });

  it.each([
    ["aggiorna", () => aggiornaFederazioneAction(undefined, buildFormData({ nome: "X" }))],
    ["attiva", () => impostaAttivaFederazioneAction(undefined, buildFormData({ attiva: "true" }))],
    ["elimina", () => eliminaFederazioneAction(undefined, buildFormData({}))],
  ])("%s rifiuta un id mancante senza toccare il DB", async (_nome, azione) => {
    const result = await azione();
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Federazione non trovata." },
    });
    expect(aggiornaFederazioneMock).not.toHaveBeenCalled();
    expect(impostaAttivaFederazioneMock).not.toHaveBeenCalled();
    expect(eliminaFederazioneMock).not.toHaveBeenCalled();
  });

  it("P2025 in aggiornamento (eliminata nel frattempo) diventa 'non trovata'", async () => {
    aggiornaFederazioneMock.mockRejectedValue(erroreConCodice("P2025"));
    const result = await aggiornaFederazioneAction(
      undefined,
      buildFormData({ id: "a", nome: "Fipav" })
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Federazione non trovata." },
    });
  });

  it("P2025 nel cambio di stato diventa 'non trovata'", async () => {
    impostaAttivaFederazioneMock.mockRejectedValue(erroreConCodice("P2025"));
    const result = await impostaAttivaFederazioneAction(
      undefined,
      buildFormData({ id: "a", attiva: "true" })
    );
    expect(result).toMatchObject({ error: { message: "Federazione non trovata." } });
  });

  it("eliminare una Federazione gia' eliminata (P2025) e' un successo", async () => {
    eliminaFederazioneMock.mockRejectedValue(erroreConCodice("P2025"));
    const result = await eliminaFederazioneAction(undefined, buildFormData({ id: "a" }));
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/federazioni");
  });

  it.each([
    [
      "aggiorna",
      () => aggiornaFederazioneMock.mockRejectedValue(new Error("db")),
      () => aggiornaFederazioneAction(undefined, buildFormData({ id: "a", nome: "X" })),
    ],
    [
      "attiva",
      () => impostaAttivaFederazioneMock.mockRejectedValue(new Error("db")),
      () => impostaAttivaFederazioneAction(undefined, buildFormData({ id: "a", attiva: "true" })),
    ],
    [
      "sposta",
      () => riordinaFederazioniMock.mockRejectedValue(new Error("db")),
      () => spostaFederazioneAction(undefined, buildFormData({ id: "b", direzione: "su" })),
    ],
    [
      "elimina",
      () => eliminaFederazioneMock.mockRejectedValue(new Error("db")),
      () => eliminaFederazioneAction(undefined, buildFormData({ id: "a" })),
    ],
  ])("%s restituisce INTERNAL su un errore imprevisto", async (_nome, prepara, azione) => {
    silenziaConsoleError();
    prepara();
    const result = await azione();
    expect(result).toMatchObject({ error: { code: "INTERNAL" } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("riattiva una Federazione disattivata", async () => {
    const result = await impostaAttivaFederazioneAction(
      undefined,
      buildFormData({ id: "c", attiva: "true" })
    );
    expect(result).toEqual({ success: true });
    expect(impostaAttivaFederazioneMock).toHaveBeenCalledWith("c", true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/federazioni");
  });

  it("sposta giu' scambiando con la successiva", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "a", direzione: "giu" })
    );
    expect(result).toEqual({ success: true });
    expect(riordinaFederazioniMock).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("su sul primo elemento non fa nulla", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "a", direzione: "su" })
    );
    expect(result).toEqual({ success: true });
    expect(riordinaFederazioniMock).not.toHaveBeenCalled();
  });
});

describe("guard Ruoli", () => {
  it("ogni azione chiede ADMIN/DIRIGENTE e non scrive nulla se rifiutata", async () => {
    requireRuoloMock.mockResolvedValue(FORBIDDEN);
    const azioni = [
      () => creaFederazioneAction(undefined, buildFormData({ nome: "CSI" })),
      () => aggiornaFederazioneAction(undefined, buildFormData({ id: "a", nome: "X" })),
      () => impostaAttivaFederazioneAction(undefined, buildFormData({ id: "a", attiva: "false" })),
      () => spostaFederazioneAction(undefined, buildFormData({ id: "b", direzione: "su" })),
      () => eliminaFederazioneAction(undefined, buildFormData({ id: "a" })),
    ];
    for (const azione of azioni) {
      expect(await azione()).toEqual(FORBIDDEN);
    }
    for (const chiamata of requireRuoloMock.mock.calls) {
      expect(chiamata[0]).toEqual(["ADMIN", "DIRIGENTE"]);
    }
    expect(creaFederazioneMock).not.toHaveBeenCalled();
    expect(aggiornaFederazioneMock).not.toHaveBeenCalled();
    expect(impostaAttivaFederazioneMock).not.toHaveBeenCalled();
    expect(riordinaFederazioniMock).not.toHaveBeenCalled();
    expect(eliminaFederazioneMock).not.toHaveBeenCalled();
  });
});

describe("creaFederazioneAction", () => {
  it("crea con nome trimmato e sigla vuota -> null", async () => {
    const result = await creaFederazioneAction(
      undefined,
      buildFormData({ nome: "  CSI  ", sigla: "   " })
    );
    expect(result).toEqual({ success: true });
    expect(creaFederazioneMock).toHaveBeenCalledWith({ nome: "CSI", sigla: null });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/federazioni");
  });

  it("rifiuta un nome vuoto", async () => {
    const result = await creaFederazioneAction(undefined, buildFormData({ nome: "   " }));
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome è obbligatorio." },
    });
    expect(creaFederazioneMock).not.toHaveBeenCalled();
  });

  it("rifiuta un nome duplicato senza distinzione maiuscole/minuscole", async () => {
    trovaFederazionePerNomeInsensitiveMock.mockResolvedValue(federazioniFinte()[0]);
    const result = await creaFederazioneAction(undefined, buildFormData({ nome: " fipav " }));
    expect(trovaFederazionePerNomeInsensitiveMock).toHaveBeenCalledWith("fipav", undefined);
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Esiste già una federazione con questo nome." },
    });
    expect(creaFederazioneMock).not.toHaveBeenCalled();
  });

  it("rifiuta una sigla troppo lunga", async () => {
    const result = await creaFederazioneAction(
      undefined,
      buildFormData({ nome: "CSI", sigla: "X".repeat(21) })
    );
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(creaFederazioneMock).not.toHaveBeenCalled();
  });

  it("restituisce INTERNAL se la scrittura fallisce", async () => {
    creaFederazioneMock.mockRejectedValue(new Error("db"));
    silenziaConsoleError();
    const result = await creaFederazioneAction(undefined, buildFormData({ nome: "CSI" }));
    expect(result).toMatchObject({ error: { code: "INTERNAL" } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("aggiornaFederazioneAction", () => {
  it("esclude la Federazione stessa dal controllo duplicati (rinomina FIPAV -> Fipav)", async () => {
    const result = await aggiornaFederazioneAction(
      undefined,
      buildFormData({ id: "a", nome: "Fipav", sigla: "FIPAV" })
    );
    expect(trovaFederazionePerNomeInsensitiveMock).toHaveBeenCalledWith("Fipav", "a");
    expect(result).toEqual({ success: true });
    expect(aggiornaFederazioneMock).toHaveBeenCalledWith("a", { nome: "Fipav", sigla: "FIPAV" });
  });

  it("rifiuta un nome gia' usato da un'altra Federazione", async () => {
    trovaFederazionePerNomeInsensitiveMock.mockResolvedValue(federazioniFinte()[1]);
    const result = await aggiornaFederazioneAction(
      undefined,
      buildFormData({ id: "a", nome: "centro sportivo italiano" })
    );
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(aggiornaFederazioneMock).not.toHaveBeenCalled();
  });
});

describe("impostaAttivaFederazioneAction", () => {
  it("disattiva una Federazione", async () => {
    const result = await impostaAttivaFederazioneAction(
      undefined,
      buildFormData({ id: "a", attiva: "false" })
    );
    expect(result).toEqual({ success: true });
    expect(impostaAttivaFederazioneMock).toHaveBeenCalledWith("a", false);
  });

  it("rifiuta un valore malformato invece di trattarlo come false", async () => {
    const result = await impostaAttivaFederazioneAction(undefined, buildFormData({ id: "a" }));
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(impostaAttivaFederazioneMock).not.toHaveBeenCalled();
  });
});

describe("spostaFederazioneAction", () => {
  it("scambia la Federazione con la precedente", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );
    expect(result).toEqual({ success: true });
    expect(riordinaFederazioniMock).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("al margine non fa nulla e non e' un errore", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "c", direzione: "giu" })
    );
    expect(result).toEqual({ success: true });
    expect(riordinaFederazioniMock).not.toHaveBeenCalled();
  });

  it("rifiuta una direzione non valida", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "b", direzione: "sinistra" })
    );
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
  });

  it("rifiuta una Federazione inesistente", async () => {
    const result = await spostaFederazioneAction(
      undefined,
      buildFormData({ id: "zzz", direzione: "su" })
    );
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(riordinaFederazioniMock).not.toHaveBeenCalled();
  });
});

describe("eliminaFederazioneAction", () => {
  it("elimina una Federazione mai usata", async () => {
    const result = await eliminaFederazioneAction(undefined, buildFormData({ id: "c" }));
    expect(federazioneInUsoMock).toHaveBeenCalledWith("c");
    expect(result).toEqual({ success: true });
    expect(eliminaFederazioneMock).toHaveBeenCalledWith("c");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/federazioni");
  });

  it("blocca l'eliminazione di una Federazione in uso e suggerisce la disattivazione", async () => {
    federazioneInUsoMock.mockResolvedValue(true);
    const result = await eliminaFederazioneAction(undefined, buildFormData({ id: "a" }));
    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Questa federazione è usata in almeno un tesseramento e non può essere eliminata: puoi disattivarla.",
      },
    });
    expect(eliminaFederazioneMock).not.toHaveBeenCalled();
  });
});

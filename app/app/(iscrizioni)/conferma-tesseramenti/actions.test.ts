import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const requireRuoloMock = vi.fn();
const risolviAnnoAgonisticoCorrenteMock = vi.fn();
const salvaModificheTesseramentoMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  risolviAnnoAgonisticoCorrente: risolviAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/tesseramento", () => ({
  salvaModificheTesseramento: salvaModificheTesseramentoMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { salvaTesseramenti } = await import("./actions");

function formData(voci: [string, string][]): FormData {
  const dati = new FormData();
  for (const [chiave, valore] of voci) dati.append(chiave, valore);
  return dati;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  risolviAnnoAgonisticoCorrenteMock.mockReset();
  risolviAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  salvaModificheTesseramentoMock.mockReset();
  salvaModificheTesseramentoMock.mockResolvedValue({ ok: true });
  revalidatePathMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("salvaTesseramenti (Server Action)", () => {
  it("restituisce FORBIDDEN e non scrive nulla se il chiamante non e' Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    const result = await salvaTesseramenti(
      undefined,
      formData([["atletaModificata", "a1"]])
    );
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(salvaModificheTesseramentoMock).not.toHaveBeenCalled();
  });

  it("rifiuta un invio senza righe modificate", async () => {
    const result = await salvaTesseramenti(
      undefined,
      formData([["federazione:a1", "fipav"]])
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nessuna modifica da salvare." },
    });
    expect(risolviAnnoAgonisticoCorrenteMock).not.toHaveBeenCalled();
    expect(salvaModificheTesseramentoMock).not.toHaveBeenCalled();
  });

  it("invia solo le righe modificate, con l'insieme completo delle loro Federazioni", async () => {
    const result = await salvaTesseramenti(
      undefined,
      formData([
        ["atletaModificata", "a1"],
        ["atletaModificata", "a1"],
        ["atletaModificata", "a2"],
        ["federazione:a1", "fipav"],
        ["federazione:a1", "csi"],
        // Riga non modificata: le sue caselle vengono ignorate.
        ["federazione:a3", "fipav"],
      ])
    );
    expect(result).toEqual({ success: true });
    expect(salvaModificheTesseramentoMock).toHaveBeenCalledWith(
      "anno-1",
      [
        { atletaId: "a1", federazioni: ["fipav", "csi"] },
        { atletaId: "a2", federazioni: [] },
      ],
      { consentiSvuotamento: false }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/conferma-tesseramenti");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/gruppi");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/i-miei-gruppi");
  });

  it("passa consentiSvuotamento solo con confermaRimozioneTotale=1", async () => {
    await salvaTesseramenti(
      undefined,
      formData([
        ["atletaModificata", "a1"],
        ["confermaRimozioneTotale", "1"],
      ])
    );
    expect(salvaModificheTesseramentoMock).toHaveBeenCalledWith(
      "anno-1",
      [{ atletaId: "a1", federazioni: [] }],
      { consentiSvuotamento: true }
    );
  });

  it("svuotamento non confermato: errore di validazione, nessuna revalidazione", async () => {
    salvaModificheTesseramentoMock.mockResolvedValue({
      ok: false,
      motivo: "conferma_richiesta",
      atletaIds: ["a1"],
    });
    const result = await salvaTesseramenti(undefined, formData([["atletaModificata", "a1"]]));
    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Alcune Atlete resterebbero senza alcuna federazione: ricarica la pagina, ricontrolla e salva di nuovo confermando la rimozione.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("Federazione non valida: errore di validazione", async () => {
    salvaModificheTesseramentoMock.mockResolvedValue({
      ok: false,
      motivo: "federazione_non_valida",
      atletaIds: ["a1"],
    });
    const result = await salvaTesseramenti(
      undefined,
      formData([
        ["atletaModificata", "a1"],
        ["federazione:a1", "zzz"],
      ])
    );
    expect(result).toMatchObject({ error: { code: "VALIDATION" } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("restituisce INTERNAL se il salvataggio fallisce", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    salvaModificheTesseramentoMock.mockRejectedValue(new Error("db"));
    const result = await salvaTesseramenti(undefined, formData([["atletaModificata", "a1"]]));
    expect(result).toMatchObject({ error: { code: "INTERNAL" } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

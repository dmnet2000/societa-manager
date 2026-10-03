import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const trovaAnnoAgonisticoCorrenteMock = vi.fn();
const elencaGruppiOrdinatiMock = vi.fn();
const riordinaGruppiMock = vi.fn();
const impostaVisibilitaGruppoMock = vi.fn();
const impostaVisibilitaClassificaMock = vi.fn();
const campionatoConClassificaInStagioneMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/anno-agonistico", () => ({
  trovaAnnoAgonisticoCorrente: trovaAnnoAgonisticoCorrenteMock,
}));

vi.mock("@/lib/ordine-squadre", () => ({
  elencaGruppiOrdinati: elencaGruppiOrdinatiMock,
  riordinaGruppi: riordinaGruppiMock,
  impostaVisibilitaGruppo: impostaVisibilitaGruppoMock,
  impostaVisibilitaClassifica: impostaVisibilitaClassificaMock,
  campionatoConClassificaInStagione: campionatoConClassificaInStagioneMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const {
  spostaGruppoAction,
  impostaVisibilitaGruppoAction,
  impostaVisibilitaClassificaAction,
} = await import("./actions");

function buildFormData(fields: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function gruppiFinti() {
  return [
    { id: "a", nome: "Under 13", ordine: 0 },
    { id: "b", nome: "Under 15", ordine: 1 },
    { id: "c", nome: "Under 17", ordine: 2 },
  ];
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  trovaAnnoAgonisticoCorrenteMock.mockReset();
  trovaAnnoAgonisticoCorrenteMock.mockResolvedValue({ id: "anno-1" });
  elencaGruppiOrdinatiMock.mockReset();
  elencaGruppiOrdinatiMock.mockResolvedValue(gruppiFinti());
  riordinaGruppiMock.mockReset();
  riordinaGruppiMock.mockResolvedValue(undefined);
  impostaVisibilitaGruppoMock.mockReset();
  impostaVisibilitaGruppoMock.mockResolvedValue(undefined);
  impostaVisibilitaClassificaMock.mockReset();
  impostaVisibilitaClassificaMock.mockResolvedValue(undefined);
  campionatoConClassificaInStagioneMock.mockReset();
  campionatoConClassificaInStagioneMock.mockResolvedValue(true);
  revalidatePathMock.mockReset();
});

describe("spostaGruppoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per una direzione non valida", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "laterale" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Direzione non valida." },
    });
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se non esiste una stagione corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
    });
    expect(elencaGruppiOrdinatiMock).not.toHaveBeenCalled();
  });

  it("scambia con il Gruppo precedente su \"su\" e revalida /app/ordine-squadre e /squadre", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(elencaGruppiOrdinatiMock).toHaveBeenCalledWith("anno-1");
    expect(riordinaGruppiMock).toHaveBeenCalledWith(["b", "a", "c"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/ordine-squadre");
    expect(revalidatePathMock).toHaveBeenCalledWith("/squadre");
  });

  it("scambia con il Gruppo successivo su \"giu\"", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("e' un no-op (success) su \"su\" per il primo Gruppo - nessuna scrittura", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "a", direzione: "su" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("e' un no-op (success) su \"giu\" per l'ultimo Gruppo - nessuna scrittura", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "c", direzione: "giu" })
    );

    expect(result).toEqual({ success: true });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se l'id non corrisponde a nessun Gruppo", async () => {
    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "inesistente", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Gruppo non trovato." },
    });
    expect(riordinaGruppiMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando riordinaGruppi lancia", async () => {
    riordinaGruppiMock.mockRejectedValue(new Error("db down"));

    const result = await spostaGruppoAction(
      undefined,
      buildFormData({ id: "b", direzione: "su" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile riordinare le squadre. Riprova." },
    });
  });
});

describe("impostaVisibilitaGruppoAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaVisibilitaGruppoAction(
      undefined,
      buildFormData({ id: "b", visibilePubblico: "false" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(impostaVisibilitaGruppoMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un valore di visibilità non valido/mancante", async () => {
    const result = await impostaVisibilitaGruppoAction(
      undefined,
      buildFormData({ id: "b", visibilePubblico: "forse" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Valore di visibilità non valido." },
    });
    expect(impostaVisibilitaGruppoMock).not.toHaveBeenCalled();
  });

  it("nasconde il Gruppo e revalida /app/ordine-squadre e /squadre", async () => {
    const result = await impostaVisibilitaGruppoAction(
      undefined,
      buildFormData({ id: "b", visibilePubblico: "false" })
    );

    expect(result).toEqual({ success: true });
    expect(impostaVisibilitaGruppoMock).toHaveBeenCalledWith("b", false);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/ordine-squadre");
    expect(revalidatePathMock).toHaveBeenCalledWith("/squadre");
  });

  it("rende di nuovo visibile il Gruppo", async () => {
    const result = await impostaVisibilitaGruppoAction(
      undefined,
      buildFormData({ id: "b", visibilePubblico: "true" })
    );

    expect(result).toEqual({ success: true });
    expect(impostaVisibilitaGruppoMock).toHaveBeenCalledWith("b", true);
  });

  it("returns INTERNAL fail-closed quando impostaVisibilitaGruppo lancia", async () => {
    impostaVisibilitaGruppoMock.mockRejectedValue(new Error("db down"));

    const result = await impostaVisibilitaGruppoAction(
      undefined,
      buildFormData({ id: "b", visibilePubblico: "false" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della squadra. Riprova.",
      },
    });
  });
});

describe("impostaVisibilitaClassificaAction", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin/Site Manager (es. DIRIGENTE)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "false" })
    );

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "SITE_MANAGER"]);
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION per un valore di visibilità non valido/mancante", async () => {
    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Valore di visibilità non valido." },
    });
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se manca l'id del Campionato o e' solo spazi", async () => {
    const casi: Record<string, string>[] = [
      { classificaVisibile: "false" },
      { id: "   ", classificaVisibile: "false" },
    ];
    for (const fields of casi) {
      const result = await impostaVisibilitaClassificaAction(undefined, buildFormData(fields));

      expect(result).toEqual({
        error: { code: "VALIDATION", message: "Campionato non valido." },
      });
    }
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se l'id non e' una stringa (es. un file)", async () => {
    const formData = new FormData();
    formData.append("id", new Blob(["c1"]), "c1.txt");
    formData.append("classificaVisibile", "false");

    const result = await impostaVisibilitaClassificaAction(undefined, formData);

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non valido." },
    });
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se non esiste una stagione corrente", async () => {
    trovaAnnoAgonisticoCorrenteMock.mockResolvedValue(null);

    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "false" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nessuna stagione corrente trovata." },
    });
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION se il Campionato non e' della stagione corrente o non ha link FIPAV", async () => {
    campionatoConClassificaInStagioneMock.mockResolvedValue(false);

    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: " c1 ", classificaVisibile: "false" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non valido." },
    });
    expect(campionatoConClassificaInStagioneMock).toHaveBeenCalledWith("c1", "anno-1");
    expect(impostaVisibilitaClassificaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("nasconde la classifica e revalida /app/ordine-squadre e /classifiche", async () => {
    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "false" })
    );

    expect(result).toEqual({ success: true });
    expect(campionatoConClassificaInStagioneMock).toHaveBeenCalledWith("c1", "anno-1");
    expect(impostaVisibilitaClassificaMock).toHaveBeenCalledWith("c1", false);
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/ordine-squadre");
    expect(revalidatePathMock).toHaveBeenCalledWith("/classifiche");
  });

  it("rende di nuovo visibile la classifica", async () => {
    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "true" })
    );

    expect(result).toEqual({ success: true });
    expect(impostaVisibilitaClassificaMock).toHaveBeenCalledWith("c1", true);
  });

  it("returns VALIDATION dedicato se il Campionato sparisce prima della scrittura (Prisma P2025)", async () => {
    impostaVisibilitaClassificaMock.mockRejectedValue(
      Object.assign(new Error("Record to update not found"), { code: "P2025" })
    );

    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "false" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Campionato non trovato. Ricarica la pagina." },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed quando impostaVisibilitaClassifica lancia", async () => {
    impostaVisibilitaClassificaMock.mockRejectedValue(new Error("db down"));

    const result = await impostaVisibilitaClassificaAction(
      undefined,
      buildFormData({ id: "c1", classificaVisibile: "false" })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare la visibilità della classifica. Riprova.",
      },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

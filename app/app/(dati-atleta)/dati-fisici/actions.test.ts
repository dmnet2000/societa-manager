import { describe, expect, it, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const inserisciMisurazioneMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/db-rls/misurazione-atleta", () => ({
  inserisciMisurazione: inserisciMisurazioneMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { inserisciMisurazioneAction } = await import("./actions");

function buildFormData(fields: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        formData.append(key, v);
      }
    } else {
      formData.append(key, value);
    }
  }
  return formData;
}

const campiValidiSingolo = {
  atletaId: "atleta-1",
  tipo: "Altezza",
  valore: "178",
  unitaMisura: "cm",
  data: "2026-07-31",
};

beforeEach(() => {
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: "utente-1" } }, error: null });
  inserisciMisurazioneMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("inserisciMisurazioneAction", () => {
  it("returns a validation error when atletaId is missing", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, atletaId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Atleta non specificata." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when tipo is missing", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, tipo: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il tipo è obbligatorio." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when valore is missing (single-valore path, comportamento invariato)", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, valore: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the valore field is entirely absent from the submission (review fix)", async () => {
    const formData = new FormData();
    formData.append("atletaId", "atleta-1");
    formData.append("tipo", "Altezza");
    formData.append("unitaMisura", "cm");
    formData.append("data", "2026-07-31");
    // Nessun campo "valore" aggiunto - formData.getAll("valore") restituisce
    // [] (a differenza di "" con un campo presente ma vuoto).

    const result = await inserisciMisurazioneAction(undefined, formData);

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the number of valore fields does not match the expected tentativi for a known parametro (review fix)", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        tipo: "Salto con rincorsa",
        valore: ["40", "42"],
        unitaMisura: "cm",
        data: "2026-07-31",
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("accepts a comma decimal separator (convenzione italiana, comportamento invariato)", async () => {
    inserisciMisurazioneMock.mockResolvedValue(undefined);

    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, valore: "178,5" })
    );

    expect(result).toEqual({ success: true });
    expect(inserisciMisurazioneMock).toHaveBeenCalledWith(
      expect.anything(),
      "atleta-1",
      { tipo: "Altezza", valori: [178.5], unitaMisura: "cm", data: "2026-07-31" }
    );
  });

  it("returns a validation error when unitaMisura is missing", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, unitaMisura: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'unità di misura è obbligatoria." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the date format is invalid", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({ ...campiValidiSingolo, data: "31/07/2026" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato data non valido." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("saves a single valore (comportamento invariato, Story 6.1)", async () => {
    inserisciMisurazioneMock.mockResolvedValue(undefined);

    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData(campiValidiSingolo)
    );

    expect(result).toEqual({ success: true });
    expect(inserisciMisurazioneMock).toHaveBeenCalledWith(
      expect.anything(),
      "atleta-1",
      { tipo: "Altezza", valori: [178], unitaMisura: "cm", data: "2026-07-31" }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/dati-fisici");
  });

  it("saves 3 valori from a single submission (Story 9.16 AC #3)", async () => {
    inserisciMisurazioneMock.mockResolvedValue(undefined);

    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        tipo: "Salto con rincorsa",
        valore: ["40", "42", "38"],
        unitaMisura: "cm",
        data: "2026-07-31",
      })
    );

    expect(result).toEqual({ success: true });
    expect(inserisciMisurazioneMock).toHaveBeenCalledWith(
      expect.anything(),
      "atleta-1",
      {
        tipo: "Salto con rincorsa",
        valori: [40, 42, 38],
        unitaMisura: "cm",
        data: "2026-07-31",
      }
    );
  });

  it("fails fast when one of 3 valori is invalid, no write at all (Story 9.16 AC #3)", async () => {
    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData({
        atletaId: "atleta-1",
        tipo: "Salto con rincorsa",
        valore: ["40", "", "38"],
        unitaMisura: "cm",
        data: "2026-07-31",
      })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il valore è obbligatorio e deve essere numerico." },
    });
    expect(inserisciMisurazioneMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the insert fails", async () => {
    inserisciMisurazioneMock.mockRejectedValue(new Error("db down"));

    const result = await inserisciMisurazioneAction(
      undefined,
      buildFormData(campiValidiSingolo)
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare la misurazione. Riprova." },
    });
  });
});

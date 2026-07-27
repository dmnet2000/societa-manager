import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const palestraCreateMock = vi.fn();
const palestraUpdateMock = vi.fn();
const campoCreateMock = vi.fn();
const campoUpdateMock = vi.fn();
const revalidatePathMock = vi.fn();
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    palestra: { create: palestraCreateMock, update: palestraUpdateMock },
    campo: { create: campoCreateMock, update: campoUpdateMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaPalestra, aggiornaPalestra, creaCampo, aggiornaCampo } =
  await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  palestraCreateMock.mockReset();
  palestraUpdateMock.mockReset();
  campoCreateMock.mockReset();
  campoUpdateMock.mockReset();
  revalidatePathMock.mockReset();
  fetchMock.mockReset();
});

describe("creaPalestra", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(palestraCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing (AC #1)", async () => {
    const result = await creaPalestra(undefined, buildFormData({ nome: "  " }));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome della Palestra è obbligatorio." },
    });
    expect(palestraCreateMock).not.toHaveBeenCalled();
  });

  it("creates a Palestra with nome and indirizzo (AC #1)", async () => {
    palestraCreateMock.mockResolvedValue({ id: "p1" });

    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale", indirizzo: "Via Roma 1" })
    );

    expect(result).toEqual({ success: true });
    expect(palestraCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Palazzetto Comunale",
        indirizzo: "Via Roma 1",
        latitudine: null,
        longitudine: null,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/palestre");
  });

  it("creates a Palestra with indirizzo null when not provided (AC #1)", async () => {
    palestraCreateMock.mockResolvedValue({ id: "p1" });

    await creaPalestra(undefined, buildFormData({ nome: "Palazzetto Comunale" }));

    expect(palestraCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Palazzetto Comunale",
        indirizzo: null,
        latitudine: null,
        longitudine: null,
      },
    });
  });

  it("creates a Palestra with coordinates parsed from a pasted Maps link (AC #4, estensione)", async () => {
    palestraCreateMock.mockResolvedValue({ id: "p1" });

    const result = await creaPalestra(
      undefined,
      buildFormData({
        nome: "Palazzetto Comunale",
        linkMaps: "https://www.google.com/maps/@45.123456,12.654321,15z",
      })
    );

    expect(result).toEqual({ success: true });
    expect(palestraCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Palazzetto Comunale",
        indirizzo: null,
        latitudine: 45.123456,
        longitudine: 12.654321,
      },
    });
  });

  it("resolves a shortened Maps link before parsing coordinates (estensione)", async () => {
    palestraCreateMock.mockResolvedValue({ id: "p1" });
    fetchMock.mockResolvedValue({ url: "https://www.google.com/maps/@45.1,12.6,15z" });

    await creaPalestra(
      undefined,
      buildFormData({
        nome: "Palazzetto Comunale",
        linkMaps: "https://maps.app.goo.gl/abc123",
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://maps.app.goo.gl/abc123",
      expect.objectContaining({ redirect: "follow" })
    );
    expect(palestraCreateMock).toHaveBeenCalledWith({
      data: {
        nome: "Palazzetto Comunale",
        indirizzo: null,
        latitudine: 45.1,
        longitudine: 12.6,
      },
    });
  });

  it("returns a validation error when a coordinate-shaped link is not a Google Maps domain (security, review fix)", async () => {
    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale", linkMaps: "https://example.com/?q=45.1,12.6" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Link Google Maps non valido: incolla il link di condivisione della posizione.",
      },
    });
    expect(palestraCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when a shortened link redirects outside Google Maps (security, review fix)", async () => {
    fetchMock.mockResolvedValue({ url: "https://example.com/attacker-controlled" });

    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale", linkMaps: "https://maps.app.goo.gl/abc123" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Link Google Maps non valido: incolla il link di condivisione della posizione.",
      },
    });
    expect(palestraCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Maps link has no recognizable coordinates (AC #5, estensione)", async () => {
    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale", linkMaps: "non un link Maps valido" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Link Google Maps non valido: incolla il link di condivisione della posizione.",
      },
    });
    expect(palestraCreateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the create fails", async () => {
    palestraCreateMock.mockRejectedValue(new Error("db down"));

    const result = await creaPalestra(
      undefined,
      buildFormData({ nome: "Palazzetto Comunale" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare la Palestra. Riprova." },
    });
  });
});

describe("aggiornaPalestra", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaPalestra(
      undefined,
      buildFormData({ id: "p1", nome: "Nuovo Nome" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(palestraUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing (AC #3)", async () => {
    const result = await aggiornaPalestra(
      undefined,
      buildFormData({ id: "p1", nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome della Palestra è obbligatorio." },
    });
    expect(palestraUpdateMock).not.toHaveBeenCalled();
  });

  it("updates nome and indirizzo for the given id (AC #3)", async () => {
    palestraUpdateMock.mockResolvedValue({ id: "p1" });

    const result = await aggiornaPalestra(
      undefined,
      buildFormData({ id: "p1", nome: "Nuovo Nome", indirizzo: "Via Nuova 2" })
    );

    expect(result).toBeUndefined();
    expect(palestraUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { nome: "Nuovo Nome", indirizzo: "Via Nuova 2", latitudine: null, longitudine: null },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/palestre");
  });

  it("updates coordinates parsed from a pasted Maps link (AC #4, estensione)", async () => {
    palestraUpdateMock.mockResolvedValue({ id: "p1" });

    await aggiornaPalestra(
      undefined,
      buildFormData({
        id: "p1",
        nome: "Nuovo Nome",
        linkMaps: "https://www.google.com/maps?q=45.123456,12.654321",
      })
    );

    expect(palestraUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        nome: "Nuovo Nome",
        indirizzo: null,
        latitudine: 45.123456,
        longitudine: 12.654321,
      },
    });
  });

  it("clears coordinates when the Maps link field is left empty (estensione)", async () => {
    palestraUpdateMock.mockResolvedValue({ id: "p1" });

    await aggiornaPalestra(undefined, buildFormData({ id: "p1", nome: "Nuovo Nome" }));

    expect(palestraUpdateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { nome: "Nuovo Nome", indirizzo: null, latitudine: null, longitudine: null },
    });
  });

  it("returns a validation error when the Maps link has no recognizable coordinates (AC #5, estensione)", async () => {
    const result = await aggiornaPalestra(
      undefined,
      buildFormData({ id: "p1", nome: "Nuovo Nome", linkMaps: "non un link Maps valido" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Link Google Maps non valido: incolla il link di condivisione della posizione.",
      },
    });
    expect(palestraUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the update fails (e.g. id inesistente, P2025)", async () => {
    palestraUpdateMock.mockRejectedValue(new Error("Record not found"));

    const result = await aggiornaPalestra(
      undefined,
      buildFormData({ id: "non-esiste", nome: "Nuovo Nome" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Palestra. Riprova." },
    });
  });
});

describe("creaCampo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaCampo(
      undefined,
      buildFormData({ palestraId: "p1", nome: "Campo 1" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(campoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing (AC #2)", async () => {
    const result = await creaCampo(
      undefined,
      buildFormData({ palestraId: "p1", nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Campo è obbligatorio." },
    });
    expect(campoCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming the Palestra, not the Campo, when palestraId is missing (review fix)", async () => {
    const result = await creaCampo(
      undefined,
      buildFormData({ palestraId: "", nome: "Campo 1" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Palestra non specificata." },
    });
    expect(campoCreateMock).not.toHaveBeenCalled();
  });

  it("creates a Campo linked to the given Palestra (AC #2)", async () => {
    campoCreateMock.mockResolvedValue({ id: "c1" });

    const result = await creaCampo(
      undefined,
      buildFormData({ palestraId: "p1", nome: "Campo 1" })
    );

    expect(result).toEqual({ success: true });
    expect(campoCreateMock).toHaveBeenCalledWith({
      data: { nome: "Campo 1", palestraId: "p1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/palestre");
  });

  it("returns a friendly error, no crash, when the create fails (e.g. palestraId inesistente, FK violation)", async () => {
    campoCreateMock.mockRejectedValue(new Error("foreign key constraint"));

    const result = await creaCampo(
      undefined,
      buildFormData({ palestraId: "non-esiste", nome: "Campo 1" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare il Campo. Riprova." },
    });
  });
});

describe("aggiornaCampo", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await aggiornaCampo(
      undefined,
      buildFormData({ id: "c1", nome: "Campo A" })
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(campoUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when nome is missing (AC #3)", async () => {
    const result = await aggiornaCampo(
      undefined,
      buildFormData({ id: "c1", nome: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il nome del Campo è obbligatorio." },
    });
    expect(campoUpdateMock).not.toHaveBeenCalled();
  });

  it("updates nome for the given id (AC #3)", async () => {
    campoUpdateMock.mockResolvedValue({ id: "c1" });

    const result = await aggiornaCampo(
      undefined,
      buildFormData({ id: "c1", nome: "Campo A" })
    );

    expect(result).toBeUndefined();
    expect(campoUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { nome: "Campo A" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/palestre");
  });

  it("returns a friendly error, no crash, when the update fails (e.g. id inesistente, P2025)", async () => {
    campoUpdateMock.mockRejectedValue(new Error("Record not found"));

    const result = await aggiornaCampo(
      undefined,
      buildFormData({ id: "non-esiste", nome: "Campo A" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile aggiornare il Campo. Riprova." },
    });
  });
});

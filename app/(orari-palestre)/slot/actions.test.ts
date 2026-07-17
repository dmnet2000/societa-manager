import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const slotCreateMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    slot: { create: slotCreateMock },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { creaSlot } = await import("./actions");

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

const campiValidi = {
  giorno: "LUNEDI",
  oraInizio: "18:30",
  oraFine: "20:00",
  campoId: "campo-1",
  gruppoId: "gruppo-1",
};

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  slotCreateMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("creaSlot", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Admin/Dirigente", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await creaSlot(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ADMIN", "DIRIGENTE"]);
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming giorno when it is missing", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, giorno: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il giorno è obbligatorio." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming oraInizio when it is missing", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraInizio: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'ora di inizio è obbligatoria." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming oraFine when it is missing", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraFine: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'ora di fine è obbligatoria." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming campoId when it is missing", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, campoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Campo è obbligatorio." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error naming gruppoId when it is missing", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, gruppoId: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Il Gruppo è obbligatorio." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when giorno is not a valid GiornoSettimana value", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, giorno: "NON_UN_GIORNO" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Giorno non valido." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when oraInizio has an invalid format", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraInizio: "18.30" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato ora non valido (usa HH:MM)." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when oraFine has an invalid format", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraFine: "25:99" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato ora non valido (usa HH:MM)." },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when oraFine is not after oraInizio", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraInizio: "20:00", oraFine: "18:30" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'ora di fine deve essere successiva all'ora di inizio.",
      },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when oraFine equals oraInizio", async () => {
    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraInizio: "18:30", oraFine: "18:30" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "L'ora di fine deve essere successiva all'ora di inizio.",
      },
    });
    expect(slotCreateMock).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace from oraInizio/oraFine before validating (consistent with other actions' string fields)", async () => {
    slotCreateMock.mockResolvedValue({ id: "slot-1" });

    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, oraInizio: " 18:30 ", oraFine: " 20:00 " })
    );

    expect(result).toEqual({ success: true });
    expect(slotCreateMock).toHaveBeenCalledWith({
      data: {
        giorno: "LUNEDI",
        oraInizio: "18:30",
        oraFine: "20:00",
        campoId: "campo-1",
        gruppoId: "gruppo-1",
      },
    });
  });

  it("creates the Slot with all fields (AC #1)", async () => {
    slotCreateMock.mockResolvedValue({ id: "slot-1" });

    const result = await creaSlot(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ success: true });
    expect(slotCreateMock).toHaveBeenCalledWith({
      data: {
        giorno: "LUNEDI",
        oraInizio: "18:30",
        oraFine: "20:00",
        campoId: "campo-1",
        gruppoId: "gruppo-1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/slot");
  });

  it("returns a friendly error, no crash, when the create fails (e.g. FK violation)", async () => {
    slotCreateMock.mockRejectedValue(new Error("foreign key constraint"));

    const result = await creaSlot(
      undefined,
      buildFormData({ ...campiValidi, campoId: "non-esiste" })
    );

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile creare lo Slot. Riprova." },
    });
  });
});

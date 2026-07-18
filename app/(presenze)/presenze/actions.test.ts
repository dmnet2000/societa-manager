import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const registraPresenzeMock = vi.fn();
const revalidatePathMock = vi.fn();
const slotFindUniqueMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/db-rls/presenza", () => ({
  registraPresenze: registraPresenzeMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { slot: { findUnique: slotFindUniqueMock } },
}));

const { registraPresenze: azioneRegistraPresenze } = await import(
  "./actions"
);

const supabaseFinto = { finto: true };

function buildFormData(fields: {
  slotId?: string;
  data?: string;
  rosterAtletaId?: string[];
  presenteAtletaId?: string[];
}) {
  const formData = new FormData();
  if (fields.slotId !== undefined) formData.append("slotId", fields.slotId);
  if (fields.data !== undefined) formData.append("data", fields.data);
  for (const id of fields.rosterAtletaId ?? []) {
    formData.append("rosterAtletaId", id);
  }
  for (const id of fields.presenteAtletaId ?? []) {
    formData.append("presenteAtletaId", id);
  }
  return formData;
}

const formValida = {
  slotId: "slot-1",
  data: "2026-07-13",
  rosterAtletaId: ["a1", "a2", "a3"],
  presenteAtletaId: ["a1", "a3"],
};

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  registraPresenzeMock.mockReset();
  registraPresenzeMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
  slotFindUniqueMock.mockReset();
  // "2026-07-13" e' un Lunedi (vedi lib/giorno-settimana.test.ts) - coerente
  // con formValida.data di default.
  slotFindUniqueMock.mockResolvedValue({ giorno: "LUNEDI" });
});

describe("registraPresenze (Server Action)", () => {
  it("returns FORBIDDEN and does nothing if the caller is not Allenatore (AC #4)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(result).toEqual({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });
    expect(requireRuoloMock).toHaveBeenCalledWith(["ALLENATORE"]);
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when slotId is missing", async () => {
    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData({ ...formValida, slotId: undefined })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Lo Slot è obbligatorio." },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when data is missing", async () => {
    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData({ ...formValida, data: undefined })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La data è obbligatoria." },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when data format is invalid", async () => {
    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData({ ...formValida, data: "13-07-2026" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Formato data non valido." },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when the roster is empty", async () => {
    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData({ ...formValida, rosterAtletaId: [] })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Nessuna Atleta nel roster." },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when the Slot does not exist (review fix: difesa in profondita', mai raggiungibile dalla UI)", async () => {
    slotFindUniqueMock.mockResolvedValue(null);

    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Slot non trovato." },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when data's weekday does not match the Slot's giorno (review fix AC #2: controllo mancante nella Server Action, solo in page.tsx)", async () => {
    slotFindUniqueMock.mockResolvedValue({ giorno: "MARTEDI" });

    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La data selezionata non corrisponde al giorno di questo Slot.",
      },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("returns INTERNAL fail-closed when the Slot lookup itself throws", async () => {
    slotFindUniqueMock.mockRejectedValue(new Error("connessione fallita"));

    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare le presenze. Riprova.",
      },
    });
    expect(registraPresenzeMock).not.toHaveBeenCalled();
  });

  it("calls registraPresenze with one riga per Atleta del roster, presente in base ai checkbox spuntati (AC #1)", async () => {
    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(createClientMock).toHaveBeenCalled();
    expect(registraPresenzeMock).toHaveBeenCalledWith(supabaseFinto, [
      { atletaId: "a1", slotId: "slot-1", data: "2026-07-13", presente: true },
      { atletaId: "a2", slotId: "slot-1", data: "2026-07-13", presente: false },
      { atletaId: "a3", slotId: "slot-1", data: "2026-07-13", presente: true },
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/presenze");
    expect(result).toEqual({ success: true });
  });

  it("deduplicates rosterAtletaId before building righe (review fix: un form manomesso con id duplicati non deve far fallire l'intero upsert)", async () => {
    await azioneRegistraPresenze(
      undefined,
      buildFormData({
        ...formValida,
        rosterAtletaId: ["a1", "a1", "a2"],
        presenteAtletaId: ["a1"],
      })
    );

    expect(registraPresenzeMock).toHaveBeenCalledWith(supabaseFinto, [
      { atletaId: "a1", slotId: "slot-1", data: "2026-07-13", presente: true },
      { atletaId: "a2", slotId: "slot-1", data: "2026-07-13", presente: false },
    ]);
  });

  it("returns INTERNAL fail-closed when registraPresenze throws (incluso un rifiuto RLS, AC #4)", async () => {
    registraPresenzeMock.mockRejectedValue(new Error("RLS denial"));

    const result = await azioneRegistraPresenze(
      undefined,
      buildFormData(formValida)
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile salvare le presenze. Riprova.",
      },
    });
  });
});

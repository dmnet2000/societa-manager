import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectQueryMock = vi.fn(() => ({ eq: eqMock }));
const insertMock = vi.fn();
const updateSelectMock = vi.fn();
const updateEqMock = vi.fn(() => ({ select: updateSelectMock }));
const updateMock = vi.fn<
  (payload: Record<string, unknown>) => { eq: typeof updateEqMock }
>(() => ({ eq: updateEqMock }));
const fromMock = vi.fn(() => ({
  select: selectQueryMock,
  insert: insertMock,
  update: updateMock,
}));

const supabase = { from: fromMock } as never;

const {
  trovaCertificatoPerAtleta,
  creaCertificato,
  aggiornaCertificato,
} = await import("./certificato-medico");

const datiEsempio = {
  dataInizioValidita: new Date("2026-01-01"),
  dataFineValidita: new Date("2027-01-01"),
  mesiValidita: 12,
  modulo: "A",
};

describe("trovaCertificatoPerAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectQueryMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it("returns the existing CertificatoMedico for the given atleta", async () => {
    const cert = { id: "c1", atletaId: "a1", dataFineValidita: "2027-01-01T00:00:00.000Z" };
    maybeSingleMock.mockResolvedValue({ data: cert, error: null });

    const result = await trovaCertificatoPerAtleta(supabase, "a1");

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    expect(eqMock).toHaveBeenCalledWith("atletaId", "a1");
    expect(result).toEqual(cert);
  });

  it("returns null when no CertificatoMedico exists yet", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await trovaCertificatoPerAtleta(supabase, "a1");

    expect(result).toBeNull();
  });

  it("throws when the query fails", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(trovaCertificatoPerAtleta(supabase, "a1")).rejects.toThrow("boom");
  });
});

describe("creaCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
  });

  it("inserts a new CertificatoMedico generating id/updatedAt explicitly", async () => {
    insertMock.mockResolvedValue({ error: null });

    await creaCertificato(supabase, "a1", datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.atletaId).toBe("a1");
    expect(payload.dataInizioValidita).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.dataFineValidita).toBe("2027-01-01T00:00:00.000Z");
    expect(payload.mesiValidita).toBe(12);
    expect(payload.modulo).toBe("A");
    expect(typeof payload.updatedAt).toBe("string");
  });

  it("throws when the insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(creaCertificato(supabase, "a1", datiEsempio)).rejects.toThrow(
      "insert failed"
    );
  });
});

describe("aggiornaCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    updateEqMock.mockClear();
    updateSelectMock.mockReset();
  });

  it("updates the CertificatoMedico for the given id", async () => {
    updateSelectMock.mockResolvedValue({ data: [{ id: "c1" }], error: null });

    await aggiornaCertificato(supabase, "c1", datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    expect(updateEqMock).toHaveBeenCalledWith("id", "c1");
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.dataInizioValidita).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.dataFineValidita).toBe("2027-01-01T00:00:00.000Z");
    expect(payload.mesiValidita).toBe(12);
    expect(payload.modulo).toBe("A");
  });

  it("throws when the update fails", async () => {
    updateSelectMock.mockResolvedValue({ data: null, error: { message: "update failed" } });

    await expect(aggiornaCertificato(supabase, "c1", datiEsempio)).rejects.toThrow(
      "update failed"
    );
  });

  it("throws when no row was actually affected (RLS denial or missing id)", async () => {
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    await expect(aggiornaCertificato(supabase, "c1", datiEsempio)).rejects.toThrow(
      /nessuna riga/i
    );
  });
});

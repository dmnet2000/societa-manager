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
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: selectQueryMock,
  insert: insertMock,
  update: updateMock,
  upsert: upsertMock,
}));

const supabase = { from: fromMock } as never;

const {
  trovaCertificatoPerAtleta,
  creaCertificato,
  aggiornaCertificato,
  collegaFileCertificato,
  confermaCertificato,
  elencaCertificati,
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

describe("collegaFileCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("upserts solo id/atletaId/filePath/stato/updatedAt, mai i campi di validita' (Story 4.1 AC #4)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await collegaFileCertificato(supabase, "a1", "a1/file.pdf");

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    const [payload, opzioni] = upsertMock.mock.calls[0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.atletaId).toBe("a1");
    expect(payload.filePath).toBe("a1/file.pdf");
    // Story 4.4: ogni upload (primo o ri-caricamento) forza IN_ATTESA - un
    // Certificato appena caricato non puo' essere gia' CONFERMATO, e un
    // ri-caricamento di uno gia' confermato richiede una nuova verifica
    // (AC #3).
    expect(payload.stato).toBe("IN_ATTESA");
    expect(typeof payload.updatedAt).toBe("string");
    expect(Object.keys(payload).sort()).toEqual(
      ["atletaId", "filePath", "id", "stato", "updatedAt"].sort()
    );
    expect(opzioni).toEqual({ onConflict: "atletaId" });
  });

  it("throws when the upsert fails (incluso un rifiuto RLS per un'Atleta non propria, AC #3)", async () => {
    upsertMock.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      collegaFileCertificato(supabase, "a1", "a1/file.pdf")
    ).rejects.toThrow("row-level security");
  });
});

// Story 4.4: conferma un Certificato esistente (AC #1) o ne inserisce uno
// nuovo (AC #2) - sempre con stato CONFERMATO, in un solo upsert su
// atletaId (stessa chiave unica gia' usata da collegaFileCertificato).
describe("confermaCertificato", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("upserts i dati di validita' con stato CONFERMATO, senza filePath se non fornito (AC #1)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await confermaCertificato(supabase, "a1", datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    const [payload, opzioni] = upsertMock.mock.calls[0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.atletaId).toBe("a1");
    expect(payload.dataInizioValidita).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.dataFineValidita).toBe("2027-01-01T00:00:00.000Z");
    expect(payload.mesiValidita).toBe(12);
    expect(payload.modulo).toBe("A");
    expect(payload.stato).toBe("CONFERMATO");
    expect(payload.filePath).toBeUndefined();
    expect(typeof payload.updatedAt).toBe("string");
    expect(opzioni).toEqual({ onConflict: "atletaId" });
  });

  it("include filePath nel payload quando fornito (AC #2, inserimento manuale con scansione allegata)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await confermaCertificato(supabase, "a1", {
      ...datiEsempio,
      filePath: "a1/manuale.pdf",
    });

    const [payload] = upsertMock.mock.calls[0];
    expect(payload.filePath).toBe("a1/manuale.pdf");
    expect(payload.stato).toBe("CONFERMATO");
  });

  it("throws when the upsert fails", async () => {
    upsertMock.mockResolvedValue({ error: { message: "boom" } });

    await expect(confermaCertificato(supabase, "a1", datiEsempio)).rejects.toThrow(
      "boom"
    );
  });
});

// Story 4.4 (Task 5, Dev Notes): un'unica lettura di tutti i Certificati
// visibili al Ruolo (RLS-filtrati), non un ciclo di N chiamate a
// trovaCertificatoPerAtleta - evita N+1 query nella pagina di elenco della
// Segreteria (fino a ~200 Atlete, NFR5).
describe("elencaCertificati", () => {
  const selectAllMock = vi.fn();

  beforeEach(() => {
    selectAllMock.mockReset();
  });

  it("restituisce tutti i Certificati visibili (RLS-filtrati)", async () => {
    fromMock.mockImplementationOnce(() => ({ select: selectAllMock }) as never);
    const righe = [{ id: "c1", atletaId: "a1" }];
    selectAllMock.mockResolvedValue({ data: righe, error: null });

    const risultato = await elencaCertificati(supabase);

    expect(fromMock).toHaveBeenCalledWith("certificati_medici");
    expect(selectAllMock).toHaveBeenCalledWith(
      "id, atletaId, stato, filePath, dataInizioValidita, dataFineValidita, mesiValidita, modulo"
    );
    expect(risultato).toEqual(righe);
  });

  it("restituisce un array vuoto quando la query non ritorna righe", async () => {
    fromMock.mockImplementationOnce(() => ({ select: selectAllMock }) as never);
    selectAllMock.mockResolvedValue({ data: null, error: null });

    const risultato = await elencaCertificati(supabase);

    expect(risultato).toEqual([]);
  });

  it("throws when the query fails", async () => {
    fromMock.mockImplementationOnce(() => ({ select: selectAllMock }) as never);
    selectAllMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaCertificati(supabase)).rejects.toThrow("boom");
  });
});

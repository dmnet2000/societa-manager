import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const selectMock = vi.fn();
// Story 9.43 (review fix): segnaAtletaRimossa incatena .is("rimossaIl",
// null) dopo .eq("id", id) e prima di .select() - guardia di idempotenza,
// unica chiamante di questo ramo. aggiornaAtleta/annullaRimozioneAtleta
// continuano a saltare direttamente da .eq() a .select() (updateIsMock mai
// invocata per loro).
const updateIsMock = vi.fn(() => ({ select: selectMock }));
const eqMock = vi.fn(() => ({ select: selectMock, is: updateIsMock }));
const updateMock = vi.fn<(payload: Record<string, unknown>) => { eq: typeof eqMock }>(
  () => ({ eq: eqMock })
);
const orderMock = vi.fn();
// Story 9.43: .is("rimossaIl", null) e' chiamata SOLO quando includiRimosse
// non e' true (default) - encatenata dopo .select() direttamente
// (elencaAtlete/elencaAtletePubbliche) o dopo .in() (elencaAtletePerIds).
// isMock termina sempre con .order(), mai un'altra .is() in coda.
const isMock = vi.fn(() => ({ order: orderMock }));
const inMock = vi.fn(() => ({ order: orderMock, is: isMock }));
const elencoSelectMock = vi.fn(() => ({ order: orderMock, in: inMock, is: isMock }));
const fromMock = vi.fn(() => ({
  insert: insertMock,
  update: updateMock,
  select: elencoSelectMock,
}));

const supabase = { from: fromMock } as never;

const {
  creaAtleta,
  aggiornaAtleta,
  elencaAtlete,
  elencaAtletePubbliche,
  elencaAtletePerIds,
  segnaAtletaRimossa,
  annullaRimozioneAtleta,
} = await import("./atleta");

const datiEsempio = {
  codiceFiscale: "ABC123",
  nome: "Mario Rossi",
  sesso: "M" as const,
  dataNascita: new Date("2010-05-01"),
};

describe("creaAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
  });

  it("inserts a new Atleta generating id/updatedAt (not DB-level defaults via supabase-js) and returns the generated id (Story 1.7)", async () => {
    insertMock.mockResolvedValue({ error: null });

    const id = await creaAtleta(supabase, datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    const payload = insertMock.mock.calls[0][0];
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(id).toBe(payload.id);
    expect(payload.codiceFiscale).toBe("ABC123");
    expect(payload.dataNascita).toBe("2010-05-01T00:00:00.000Z");
    expect(typeof payload.updatedAt).toBe("string");
  });

  it("throws when the insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(creaAtleta(supabase, datiEsempio)).rejects.toThrow(
      "insert failed"
    );
  });

  it("includes email/cellulare when provided (Story 9.18)", async () => {
    insertMock.mockResolvedValue({ error: null });

    await creaAtleta(supabase, {
      ...datiEsempio,
      email: "genitore@example.com",
      cellulare: "3331234567",
    });

    const payload = insertMock.mock.calls[0][0];
    expect(payload.email).toBe("genitore@example.com");
    expect(payload.cellulare).toBe("3331234567");
  });
});

describe("aggiornaAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    selectMock.mockReset();
  });

  it("updates only the identity fields for the given id", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await aggiornaAtleta(supabase, "a1", datiEsempio);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(eqMock).toHaveBeenCalledWith("id", "a1");
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.codiceFiscale).toBe("ABC123");
    expect(payload.dataNascita).toBe("2010-05-01T00:00:00.000Z");
  });

  it("throws when the update fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    await expect(aggiornaAtleta(supabase, "a1", datiEsempio)).rejects.toThrow(
      "update failed"
    );
  });

  it("throws when no row was actually affected (RLS denial or missing id, review fix)", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(aggiornaAtleta(supabase, "a1", datiEsempio)).rejects.toThrow(
      /nessuna riga/i
    );
  });
});

describe("elencaAtlete", () => {
  beforeEach(() => {
    fromMock.mockClear();
    elencoSelectMock.mockClear();
    isMock.mockClear();
    orderMock.mockReset();
  });

  it("returns Atlete ordered by nome, including categoria e i 3 campi di rimozione (Story 1.6/1.8/9.43)", async () => {
    const atlete = [
      {
        id: "a1",
        nome: "Bianchi Laura",
        codiceFiscale: "AAA",
        categoria: "Under 13",
        rimossaIl: null,
        motivoRimozione: null,
        notaRimozione: null,
      },
      {
        id: "a2",
        nome: "Rossi Mario",
        codiceFiscale: "BBB",
        categoria: "Under 16",
        rimossaIl: null,
        motivoRimozione: null,
        notaRimozione: null,
      },
    ];
    orderMock.mockResolvedValue({ data: atlete, error: null });

    const result = await elencaAtlete(supabase);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(elencoSelectMock).toHaveBeenCalledWith(
      "id, nome, codiceFiscale, categoria, rimossaIl, motivoRimozione, notaRimozione"
    );
    // Story 9.43: default (nessuna opzione) -> esclude le rimosse.
    expect(isMock).toHaveBeenCalledWith("rimossaIl", null);
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
    expect(result).toEqual(atlete);
  });

  it("throws when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaAtlete(supabase)).rejects.toThrow("boom");
  });

  it("skips the rimossaIl filter when includiRimosse is true (Story 9.43)", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    await elencaAtlete(supabase, { includiRimosse: true });

    expect(isMock).not.toHaveBeenCalled();
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
  });
});

// Story 18.24: mirror del blocco elencaAtlete sopra, ma verifica in
// particolare che il .select() sia ristretto a "id, nome" - il vincolo di
// privacy piu' critico di questa storia (mai codiceFiscale/categoria su
// una pagina pubblica), quindi verificato esplicitamente qui e non solo
// per lettura del codice sorgente.
describe("elencaAtletePubbliche", () => {
  beforeEach(() => {
    fromMock.mockClear();
    elencoSelectMock.mockClear();
    isMock.mockClear();
    orderMock.mockReset();
  });

  it("selects only id and nome, ordered by nome - never codiceFiscale/categoria (spec-18-24 Boundaries), esclude le rimosse per default (Story 9.43)", async () => {
    const atlete = [
      { id: "a1", nome: "Bianchi Laura" },
      { id: "a2", nome: "Rossi Mario" },
    ];
    orderMock.mockResolvedValue({ data: atlete, error: null });

    const result = await elencaAtletePubbliche(supabase);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(elencoSelectMock).toHaveBeenCalledWith("id, nome");
    expect(isMock).toHaveBeenCalledWith("rimossaIl", null);
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
    expect(result).toEqual(atlete);
  });

  it("returns an empty array when there are no rows", async () => {
    orderMock.mockResolvedValue({ data: null, error: null });

    const result = await elencaAtletePubbliche(supabase);

    expect(result).toEqual([]);
  });

  it("throws when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaAtletePubbliche(supabase)).rejects.toThrow("boom");
  });
});

// Story 1.10: elenco {id, nome} per un insieme di id specifico - usata da
// admin/page.tsx per risolvere le Atlete gia' collegate a un Genitore.
describe("elencaAtletePerIds", () => {
  beforeEach(() => {
    fromMock.mockClear();
    elencoSelectMock.mockClear();
    inMock.mockClear();
    isMock.mockClear();
    orderMock.mockReset();
  });

  it("returns [] without querying the DB when ids is empty", async () => {
    const result = await elencaAtletePerIds(supabase, []);

    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("selects only id and nome, filtered by the given ids, ordered by nome, esclude le rimosse per default (Story 9.43)", async () => {
    const atlete = [
      { id: "a1", nome: "Bianchi Laura" },
      { id: "a2", nome: "Rossi Mario" },
    ];
    orderMock.mockResolvedValue({ data: atlete, error: null });

    const result = await elencaAtletePerIds(supabase, ["a1", "a2"]);

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(elencoSelectMock).toHaveBeenCalledWith("id, nome");
    expect(inMock).toHaveBeenCalledWith("id", ["a1", "a2"]);
    expect(isMock).toHaveBeenCalledWith("rimossaIl", null);
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
    expect(result).toEqual(atlete);
  });

  it("skips the rimossaIl filter when includiRimosse is true (Story 9.43)", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    await elencaAtletePerIds(supabase, ["a1"], { includiRimosse: true });

    expect(isMock).not.toHaveBeenCalled();
    expect(orderMock).toHaveBeenCalledWith("nome", { ascending: true });
  });

  it("returns an empty array when there are no matching rows", async () => {
    orderMock.mockResolvedValue({ data: null, error: null });

    const result = await elencaAtletePerIds(supabase, ["a1"]);

    expect(result).toEqual([]);
  });

  it("throws when the query fails", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(elencaAtletePerIds(supabase, ["a1"])).rejects.toThrow("boom");
  });
});

// Story 9.43: mirror esatto dei test di aggiornaAtleta sopra (stesso
// update+eq+select, stesso principio "nessuna riga aggiornata -> throw").
describe("segnaAtletaRimossa", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    updateIsMock.mockClear();
    selectMock.mockReset();
  });

  it("sets rimossaIl/motivoRimozione/notaRimozione for the given id", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await segnaAtletaRimossa(supabase, "a1", {
      motivoRimozione: "TRASFERITA",
      notaRimozione: "Passata a Volley Altrove",
    });

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(eqMock).toHaveBeenCalledWith("id", "a1");
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.motivoRimozione).toBe("TRASFERITA");
    expect(payload.notaRimozione).toBe("Passata a Volley Altrove");
    expect(typeof payload.rimossaIl).toBe("string");
  });

  // Story 9.43 (review fix): guardia di idempotenza - senza
  // .is("rimossaIl", null), una rimozione ripetuta (tab rimasta aperta, due
  // Admin in contemporanea) sovrascriverebbe silenziosamente motivo/nota/
  // data della rimozione originale.
  it("filters on rimossaIl IS NULL, not overwriting an already-removed Atleta", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await segnaAtletaRimossa(supabase, "a1", {
      motivoRimozione: "TRASFERITA",
      notaRimozione: null,
    });

    expect(updateIsMock).toHaveBeenCalledWith("rimossaIl", null);
  });

  it("throws (già rimossa) when the Atleta was already removed - zero rows match the IS NULL guard", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(
      segnaAtletaRimossa(supabase, "a1", {
        motivoRimozione: "TRASFERITA",
        notaRimozione: null,
      })
    ).rejects.toThrow(/già rimossa/i);
  });

  it("accepts a null nota (facoltativa)", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await segnaAtletaRimossa(supabase, "a1", {
      motivoRimozione: "NON_PIU_IN_SOCIETA",
      notaRimozione: null,
    });

    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.notaRimozione).toBeNull();
  });

  it("throws when the update fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    await expect(
      segnaAtletaRimossa(supabase, "a1", {
        motivoRimozione: "TRASFERITA",
        notaRimozione: null,
      })
    ).rejects.toThrow("update failed");
  });

  it("throws when no row was actually affected (id inesistente o non autorizzato)", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(
      segnaAtletaRimossa(supabase, "a1", {
        motivoRimozione: "TRASFERITA",
        notaRimozione: null,
      })
    ).rejects.toThrow(/nessuna riga/i);
  });
});

describe("annullaRimozioneAtleta", () => {
  beforeEach(() => {
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockClear();
    selectMock.mockReset();
  });

  it("resets all 3 fields to null for the given id", async () => {
    selectMock.mockResolvedValue({ data: [{ id: "a1" }], error: null });

    await annullaRimozioneAtleta(supabase, "a1");

    expect(fromMock).toHaveBeenCalledWith("atlete");
    expect(eqMock).toHaveBeenCalledWith("id", "a1");
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.rimossaIl).toBeNull();
    expect(payload.motivoRimozione).toBeNull();
    expect(payload.notaRimozione).toBeNull();
  });

  it("throws when the update fails", async () => {
    selectMock.mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    await expect(annullaRimozioneAtleta(supabase, "a1")).rejects.toThrow(
      "update failed"
    );
  });

  it("throws when no row was actually affected (id inesistente o non autorizzato)", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(annullaRimozioneAtleta(supabase, "a1")).rejects.toThrow(
      /nessuna riga/i
    );
  });
});

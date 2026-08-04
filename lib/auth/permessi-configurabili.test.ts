import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Story 12.4 (fix architetturale): letto via Supabase REST
// (createAdminClient, @/lib/auth-admin/client) invece di Prisma - questo
// modulo e' raggiunto anche dal Proxy (middleware.ts, runtime edge), che non
// puo' usare Prisma/pg (crash confermato dal vivo, vedi commento nel
// sorgente). Il mock replica la catena chainable di @supabase/supabase-js:
// .from("permessi_rotte").select("rotta, ruolo").eq("abilitato", true).
const eqMock = vi.fn();
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createAdminClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

const { rottaAbilitataPerRuolo, invalidaCachePermessi, TTL_MS } = await import(
  "./permessi-configurabili"
);

const ORA = 1_700_000_000_000;

describe("rottaAbilitataPerRuolo", () => {
  beforeEach(() => {
    eqMock.mockReset();
    selectMock.mockClear();
    fromMock.mockClear();
    createAdminClientMock.mockClear();
    invalidaCachePermessi();
  });

  it("ADMIN e' sempre abilitato e non interroga mai il database (AC #1)", async () => {
    const risultato = await rottaAbilitataPerRuolo(
      "/qualunque-rotta",
      "ADMIN",
      ORA
    );

    expect(risultato).toBe(true);
    expect(eqMock).not.toHaveBeenCalled();
  });

  it("ritorna true per una combinazione rotta+Ruolo abilitata (AC #2)", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(true);
  });

  it("ritorna false (fail-closed) per un Ruolo diverso sulla stessa rotta (AC #3)", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "ALLENATORE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("ritorna false (fail-closed) per una rotta diversa con lo stesso Ruolo (AC #3)", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    const risultato = await rottaAbilitataPerRuolo(
      "/altra-rotta",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("interroga permessi_rotte filtrando abilitato:true (AC #3)", async () => {
    eqMock.mockResolvedValue({ data: [], error: null });

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);

    expect(fromMock).toHaveBeenCalledWith("permessi_rotte");
    expect(selectMock).toHaveBeenCalledWith("rotta, ruolo");
    expect(eqMock).toHaveBeenCalledWith("abilitato", true);
  });

  it("una seconda interrogazione entro il TTL non genera una nuova query (AC #4, #5)", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    await rottaAbilitataPerRuolo("/palestre", "ALLENATORE", ORA + 1000);

    expect(eqMock).toHaveBeenCalledTimes(1);
  });

  it("una interrogazione dopo la scadenza del TTL rilegge dal database (AC #6)", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA + TTL_MS + 1);

    expect(eqMock).toHaveBeenCalledTimes(2);
  });

  it("il boundary esatto ora === scadeIl conta gia' come scaduto (>=, non >) - review fix", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    // scadeIl della prima chiamata e' esattamente ORA + TTL_MS.
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA + TTL_MS);

    expect(eqMock).toHaveBeenCalledTimes(2);
  });

  it("nega l'accesso (fail-closed) invece di propagare l'errore se la query restituisce un errore - review fix", async () => {
    eqMock.mockResolvedValue({
      data: null,
      error: { message: "db down" },
    });

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("nega l'accesso (fail-closed) se data non e' un array (risposta inattesa, review fix)", async () => {
    eqMock.mockResolvedValue({ data: null, error: null });

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("nega l'accesso (fail-closed) anche se la richiesta stessa rigetta (errore di rete/trasporto)", async () => {
    eqMock.mockRejectedValue(new Error("network down"));

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("un errore non lascia una cache corrotta: un tentativo successivo rilegge di nuovo - review fix", async () => {
    eqMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    eqMock.mockResolvedValueOnce({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    const primoTentativo = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );
    const secondoTentativo = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA + 1000
    );

    expect(primoTentativo).toBe(false);
    expect(secondoTentativo).toBe(true);
    expect(eqMock).toHaveBeenCalledTimes(2);
  });

  it("invalidaCachePermessi() forza una rilettura immediata anche entro il TTL", async () => {
    eqMock.mockResolvedValue({
      data: [{ rotta: "/palestre", ruolo: "DIRIGENTE" }],
      error: null,
    });

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    invalidaCachePermessi();
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);

    expect(eqMock).toHaveBeenCalledTimes(2);
  });
});

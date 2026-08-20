import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Story 19.9 (Epic 19, Ruolo Site Manager): letto via Supabase REST
// (createAdminClient, @/lib/auth-admin/client) invece di Prisma - questo
// modulo e' raggiunto anche dal Proxy (middleware.ts, runtime edge), che non
// puo' usare Prisma/pg. Mirror esatto del mock gia' stabilito in
// permessi-configurabili.test.ts: .from("pagine_pubbliche").select("slug").
const selectMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock }));
const createAdminClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

const { paginaPubblicaEsistePerSlug, invalidaCachePaginePubbliche, TTL_MS } =
  await import("./pagine-pubbliche-slug-cache");

const ORA = 1_700_000_000_000;

describe("paginaPubblicaEsistePerSlug", () => {
  beforeEach(() => {
    selectMock.mockReset();
    fromMock.mockClear();
    createAdminClientMock.mockClear();
    invalidaCachePaginePubbliche();
  });

  it("ritorna true per uno slug esistente", async () => {
    selectMock.mockResolvedValue({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    expect(await paginaPubblicaEsistePerSlug("/storia-societa", ORA)).toBe(true);
  });

  it("ritorna false (fail-closed) per uno slug non presente", async () => {
    selectMock.mockResolvedValue({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    expect(await paginaPubblicaEsistePerSlug("/altro-slug", ORA)).toBe(false);
  });

  it("interroga pagine_pubbliche selezionando solo slug", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await paginaPubblicaEsistePerSlug("/qualunque", ORA);

    expect(fromMock).toHaveBeenCalledWith("pagine_pubbliche");
    expect(selectMock).toHaveBeenCalledWith("slug");
  });

  it("una seconda interrogazione entro il TTL non genera una nuova query", async () => {
    selectMock.mockResolvedValue({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    await paginaPubblicaEsistePerSlug("/storia-societa", ORA);
    await paginaPubblicaEsistePerSlug("/altro-slug", ORA + 1000);

    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it("una interrogazione dopo la scadenza del TTL rilegge dal database", async () => {
    selectMock.mockResolvedValue({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    await paginaPubblicaEsistePerSlug("/storia-societa", ORA);
    await paginaPubblicaEsistePerSlug("/storia-societa", ORA + TTL_MS + 1);

    expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it("nega (fail-closed) invece di propagare l'errore se la query restituisce un errore", async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: "db down" } });

    expect(await paginaPubblicaEsistePerSlug("/storia-societa", ORA)).toBe(false);
  });

  it("nega (fail-closed) se data non e' un array (risposta inattesa)", async () => {
    selectMock.mockResolvedValue({ data: null, error: null });

    expect(await paginaPubblicaEsistePerSlug("/storia-societa", ORA)).toBe(false);
  });

  it("nega (fail-closed) anche se la richiesta stessa rigetta (errore di rete/trasporto)", async () => {
    selectMock.mockRejectedValue(new Error("network down"));

    expect(await paginaPubblicaEsistePerSlug("/storia-societa", ORA)).toBe(false);
  });

  it("un errore non lascia una cache corrotta: un tentativo successivo rilegge di nuovo", async () => {
    selectMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    selectMock.mockResolvedValueOnce({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    const primoTentativo = await paginaPubblicaEsistePerSlug("/storia-societa", ORA);
    const secondoTentativo = await paginaPubblicaEsistePerSlug(
      "/storia-societa",
      ORA + 1000
    );

    expect(primoTentativo).toBe(false);
    expect(secondoTentativo).toBe(true);
    expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it("invalidaCachePaginePubbliche() forza una rilettura immediata anche entro il TTL", async () => {
    selectMock.mockResolvedValue({
      data: [{ slug: "/storia-societa" }],
      error: null,
    });

    await paginaPubblicaEsistePerSlug("/storia-societa", ORA);
    invalidaCachePaginePubbliche();
    await paginaPubblicaEsistePerSlug("/storia-societa", ORA);

    expect(selectMock).toHaveBeenCalledTimes(2);
  });
});

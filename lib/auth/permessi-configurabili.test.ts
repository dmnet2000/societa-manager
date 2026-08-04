import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    permessoRotta: {
      findMany: findManyMock,
    },
  },
}));

const { rottaAbilitataPerRuolo, invalidaCachePermessi, TTL_MS } = await import(
  "./permessi-configurabili"
);

const ORA = 1_700_000_000_000;

describe("rottaAbilitataPerRuolo", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    invalidaCachePermessi();
  });

  it("ADMIN e' sempre abilitato e non interroga mai il database (AC #1)", async () => {
    const risultato = await rottaAbilitataPerRuolo(
      "/qualunque-rotta",
      "ADMIN",
      ORA
    );

    expect(risultato).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("ritorna true per una combinazione rotta+Ruolo abilitata (AC #2)", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(true);
  });

  it("ritorna false (fail-closed) per un Ruolo diverso sulla stessa rotta (AC #3)", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "ALLENATORE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("ritorna false (fail-closed) per una rotta diversa con lo stesso Ruolo (AC #3)", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    const risultato = await rottaAbilitataPerRuolo(
      "/altra-rotta",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("interroga il database con where: abilitato:true (AC #3)", async () => {
    findManyMock.mockResolvedValue([]);

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { abilitato: true },
      select: { rotta: true, ruolo: true },
    });
  });

  it("una seconda interrogazione entro il TTL non genera una nuova query (AC #4, #5)", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    await rottaAbilitataPerRuolo("/palestre", "ALLENATORE", ORA + 1000);

    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it("una interrogazione dopo la scadenza del TTL rilegge dal database (AC #6)", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA + TTL_MS + 1);

    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  it("il boundary esatto ora === scadeIl conta gia' come scaduto (>=, non >) - review fix", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    // scadeIl della prima chiamata e' esattamente ORA + TTL_MS.
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA + TTL_MS);

    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  it("nega l'accesso (fail-closed) invece di propagare l'errore se il database rigetta - review fix", async () => {
    findManyMock.mockRejectedValue(new Error("db down"));

    const risultato = await rottaAbilitataPerRuolo(
      "/palestre",
      "DIRIGENTE",
      ORA
    );

    expect(risultato).toBe(false);
  });

  it("un errore di database non lascia una cache corrotta: un tentativo successivo rilegge di nuovo - review fix", async () => {
    findManyMock.mockRejectedValueOnce(new Error("db down"));
    findManyMock.mockResolvedValueOnce([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

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
    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  it("invalidaCachePermessi() forza una rilettura immediata anche entro il TTL", async () => {
    findManyMock.mockResolvedValue([{ rotta: "/palestre", ruolo: "DIRIGENTE" }]);

    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);
    invalidaCachePermessi();
    await rottaAbilitataPerRuolo("/palestre", "DIRIGENTE", ORA);

    expect(findManyMock).toHaveBeenCalledTimes(2);
  });
});

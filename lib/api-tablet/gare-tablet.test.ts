import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const findManyMock = vi.fn();
const findUniqueMock = vi.fn();
const autenticaTabletMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { assegnazioneTablet: { findMany: findManyMock, findUnique: findUniqueMock } },
}));
vi.mock("./autenticazione", () => ({ autenticaTablet: autenticaTabletMock }));

const { elencaGareTablet, autorizzaGaraTablet } = await import("./gare-tablet");
const { leggiGare } = await import("./contratto");

function riga(
  numero: number,
  epoca: number,
  slot: { data: string; ora: string; palestra: string; campo?: string } | null
) {
  return {
    epoca,
    partitaTorneo: {
      id: `p-${numero}`,
      numero,
      categoriaTorneo: { nome: "Under 14" },
      squadraCasa: { nome: `Casa ${numero}` },
      squadraOspite: { nome: `Ospite ${numero}` },
      slotTorneo: slot && {
        data: slot.data,
        ora: slot.ora,
        palestra: { nome: slot.palestra },
        campo: slot.campo ? { nome: slot.campo } : null,
      },
    },
  };
}

describe("elencaGareTablet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("l'elenco prodotto passa la lettura rigorosa del contratto (anche con nomi vuoti)", async () => {
    const vuota = riga(2, 1, { data: "2027-09-04", ora: "10:00", palestra: "" });
    vuota.partitaTorneo.squadraCasa.nome = "";
    findManyMock.mockResolvedValue([riga(1, 3, null), vuota]);

    const gare = await elencaGareTablet("ut-1");
    expect(leggiGare({ gare })).toEqual({ gare });
  });

  it("legge solo le assegnazioni del tablet chiamante, solo coi campi del contratto", async () => {
    findManyMock.mockResolvedValue([]);
    await expect(elencaGareTablet("ut-1")).resolves.toEqual([]);
    const arg = findManyMock.mock.calls[0][0];
    expect(arg.where).toEqual({ utenteId: "ut-1" });
    expect(arg.include).toBeUndefined();
    expect(Object.keys(arg.select.partitaTorneo.select)).not.toContain("refertista");
  });

  it("mappa ogni gara sul contratto, con la sua epoca", async () => {
    findManyMock.mockResolvedValue([
      riga(3, 2, { data: "2027-09-04", ora: "15:30", palestra: "Palazzetto", campo: "Campo 1" }),
    ]);

    await expect(elencaGareTablet("ut-1")).resolves.toEqual([
      {
        garaId: "p-3",
        epoca: 2,
        numero: 3,
        categoria: "Under 14",
        casa: "Casa 3",
        ospite: "Ospite 3",
        data: "2027-09-04",
        ora: "15:30",
        luogo: "Palazzetto - Campo 1",
      },
    ]);
  });

  it("gara senza Slot: data, ora e luogo null; luogo senza campo = solo palestra", async () => {
    findManyMock.mockResolvedValue([
      riga(1, 1, null),
      riga(2, 1, { data: "2027-09-04", ora: "10:00", palestra: "Palestra Rossi" }),
    ]);

    const gare = await elencaGareTablet("ut-1");
    expect(gare.map((g) => [g.numero, g.data, g.ora, g.luogo])).toEqual([
      [2, "2027-09-04", "10:00", "Palestra Rossi"],
      [1, null, null, null],
    ]);
  });

  it("ordina per data, ora, numero, con le gare senza orario in fondo", async () => {
    findManyMock.mockResolvedValue([
      riga(9, 1, null),
      riga(5, 1, { data: "2027-09-05", ora: "09:00", palestra: "P" }),
      riga(4, 1, { data: "2027-09-04", ora: "18:00", palestra: "P" }),
      riga(2, 1, { data: "2027-09-04", ora: "09:00", palestra: "P" }),
      riga(1, 1, { data: "2027-09-04", ora: "09:00", palestra: "P" }),
      riga(7, 1, null),
    ]);

    const gare = await elencaGareTablet("ut-1");
    expect(gare.map((g) => g.numero)).toEqual([1, 2, 4, 5, 7, 9]);
  });

  it("non espone dati oltre il contratto (niente risultati, refertista, rose)", async () => {
    const r = riga(1, 1, null);
    Object.assign(r.partitaTorneo, { refertista: "Mario", set1Casa: 25 });
    findManyMock.mockResolvedValue([r]);

    const [gara] = await elencaGareTablet("ut-1");
    expect(Object.keys(gara).sort()).toEqual(
      ["casa", "categoria", "data", "epoca", "garaId", "luogo", "numero", "ora", "ospite"].sort()
    );
  });
});

describe("autorizzaGaraTablet", () => {
  const richiesta = new Request("https://example.test/api/tablet/v1/gare/p-1");

  beforeEach(() => {
    vi.clearAllMocks();
    autenticaTabletMock.mockResolvedValue({ ok: true, utente: { id: "auth-1" }, utenteId: "ut-1" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  async function attesoRiassegnata(esito: Awaited<ReturnType<typeof autorizzaGaraTablet>>) {
    expect(esito.ok).toBe(false);
    if (esito.ok) return "";
    expect(esito.risposta.status).toBe(409);
    const corpo = await esito.risposta.json();
    expect(corpo.error.code).toBe("RIASSEGNATA");
    return corpo.error.message as string;
  }

  it("ok quando la gara e' del tablet con l'epoca corrente", async () => {
    findUniqueMock.mockResolvedValue({ utenteId: "ut-1", epoca: 1 });

    await expect(autorizzaGaraTablet(richiesta, "p-1", 1)).resolves.toEqual({
      ok: true,
      utente: { id: "auth-1" },
      utenteId: "ut-1",
      garaId: "p-1",
      epoca: 1,
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { partitaTorneoId: "p-1" },
      select: { utenteId: true, epoca: true },
    });
  });

  it("409 RIASSEGNATA con un'epoca superata", async () => {
    findUniqueMock.mockResolvedValue({ utenteId: "ut-1", epoca: 2 });
    await attesoRiassegnata(await autorizzaGaraTablet(richiesta, "p-1", 1));
  });

  it("stesso messaggio per gara di un altro tablet, senza tablet, senza riga o inesistente", async () => {
    const messaggi = new Set<string>();
    for (const valore of [
      { utenteId: "ut-2", epoca: 1 },
      { utenteId: null, epoca: 2 },
      null,
    ]) {
      findUniqueMock.mockResolvedValueOnce(valore);
      messaggi.add(await attesoRiassegnata(await autorizzaGaraTablet(richiesta, "p-1", 1)));
    }
    expect(messaggi.size).toBe(1);
  });

  it("restituisce il rifiuto dell'autenticazione senza leggere le assegnazioni", async () => {
    const rifiuto = {
      ok: false,
      risposta: NextResponse.json({ error: { code: "FORBIDDEN", message: "x" } }, { status: 403 }),
    };
    autenticaTabletMock.mockResolvedValue(rifiuto);

    await expect(autorizzaGaraTablet(richiesta, "p-1", 1)).resolves.toBe(rifiuto);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("500 INTERNAL se il database lancia", async () => {
    findUniqueMock.mockRejectedValue(new Error("db down"));

    const esito = await autorizzaGaraTablet(richiesta, "p-1", 1);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.risposta.status).toBe(500);
    expect((await esito.risposta.json()).error.code).toBe("INTERNAL");
  });
});

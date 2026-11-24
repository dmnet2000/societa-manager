import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autorizzaMock = vi.fn();
const leggiParametriGaraMock = vi.fn();

vi.mock("@/lib/api-tablet/gare-tablet", () => ({ autorizzaGaraTablet: autorizzaMock }));
vi.mock("@/lib/parametri-formato", () => ({ leggiParametriGara: leggiParametriGaraMock }));

const { GET } = await import("./route");

const PARAMETRI = {
  versione: 1,
  setPerVincere: 2,
  puntiSet: 25,
  puntiSetDecisivo: 15,
  scartoMinimo: 2,
  cambiPerSet: 8,
  timeoutPerSet: 2,
  liberiMin: 1,
  liberiMax: 2,
  rosaMax: 14,
};

function chiama(query = "?epoca=2", versione: string | null = "1") {
  const headers: Record<string, string> = { authorization: "Bearer a.b.c" };
  if (versione !== null) headers[HEADER_VERSIONE_APP] = versione;
  const request = new Request(`https://example.test/api/tablet/v1/gare/p-1/parametri${query}`, {
    headers,
  });
  return GET(request, { params: Promise.resolve({ garaId: "p-1" }) });
}

describe("GET /api/tablet/v1/gare/{garaId}/parametri", () => {
  beforeEach(() => {
    autorizzaMock.mockReset();
    leggiParametriGaraMock.mockReset();
    vi.unstubAllEnvs();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", garaId: "p-1", epoca: 2 });
    leggiParametriGaraMock.mockResolvedValue(PARAMETRI);
  });

  it("200 { parametri } no-store, autorizzando garaId ed epoca", async () => {
    const risposta = await chiama();

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ parametri: PARAMETRI });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(autorizzaMock).toHaveBeenCalledWith(expect.any(Request), "p-1", 2);
    expect(leggiParametriGaraMock).toHaveBeenCalledWith("p-1");
  });

  it("409 RIASSEGNATA: nessun parametro letto", async () => {
    autorizzaMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json({ error: { code: "RIASSEGNATA", message: "x" } }, { status: 409 }),
    });

    const risposta = await chiama();

    expect(risposta.status).toBe(409);
    expect((await risposta.json()).error.code).toBe("RIASSEGNATA");
    expect(leggiParametriGaraMock).not.toHaveBeenCalled();
  });

  it.each([[""], ["?epoca="], ["?epoca=abc"], ["?epoca=0"], ["?epoca=-1"], ["?epoca=1.5"]])(
    "400 VALIDATION con %j, senza autorizzare",
    async (query) => {
      const risposta = await chiama(query);

      expect(risposta.status).toBe(400);
      expect((await risposta.json()).error.code).toBe("VALIDATION");
      expect(autorizzaMock).not.toHaveBeenCalled();
    }
  );

  it("426 APP_OBSOLETA senza header di versione", async () => {
    const risposta = await chiama("?epoca=2", null);

    expect(risposta.status).toBe(426);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("500 INTERNAL se i parametri non si leggono", async () => {
    leggiParametriGaraMock.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const risposta = await chiama();

    expect(risposta.status).toBe(500);
    expect((await risposta.json()).error.code).toBe("INTERNAL");
  });

  it("500 INTERNAL se la partita non esiste", async () => {
    leggiParametriGaraMock.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await chiama()).status).toBe(500);
  });
});

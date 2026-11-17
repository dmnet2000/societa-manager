import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autorizzaMock = vi.fn();
const creaClientMock = vi.fn();
const leggiRoseGaraMock = vi.fn();

vi.mock("@/lib/api-tablet/gare-tablet", () => ({ autorizzaGaraTablet: autorizzaMock }));
vi.mock("@/lib/api-tablet/client-supabase-tablet", () => ({ creaClientSupabaseTablet: creaClientMock }));
vi.mock("@/lib/rose-gara", () => ({ leggiRoseGara: leggiRoseGaraMock }));

const { GET } = await import("./route");
const { RosaForbiddenError } = await import("@/lib/db-rls/rosa");

const ROSE = {
  casa: { versione: 1, giocatori: [], tesserati: [] },
  ospite: { versione: 0, giocatori: [], tesserati: [] },
};

function chiama(query = "?epoca=2", versione: string | null = "1") {
  const headers: Record<string, string> = { authorization: "Bearer a.b.c" };
  if (versione !== null) headers[HEADER_VERSIONE_APP] = versione;
  const request = new Request(`https://example.test/api/tablet/v1/gare/p-1/rose${query}`, { headers });
  return GET(request, { params: Promise.resolve({ garaId: "p-1" }) });
}

describe("GET /api/tablet/v1/gare/{garaId}/rose", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", jwt: "a.b.c", garaId: "p-1", epoca: 2 });
    creaClientMock.mockReturnValue({ marker: "client" });
    leggiRoseGaraMock.mockResolvedValue(ROSE);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("200 con le rose, usando il client del tablet", async () => {
    const risposta = await chiama();

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual(ROSE);
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(creaClientMock).toHaveBeenCalledWith("a.b.c");
    expect(leggiRoseGaraMock).toHaveBeenCalledWith({ marker: "client" }, "p-1");
  });

  it("409 RIASSEGNATA", async () => {
    autorizzaMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json({ error: { code: "RIASSEGNATA", message: "x" } }, { status: 409 }),
    });
    const risposta = await chiama();
    expect(risposta.status).toBe(409);
    expect(leggiRoseGaraMock).not.toHaveBeenCalled();
  });

  it.each([[""], ["?epoca=abc"], ["?epoca=0"]])("400 VALIDATION con %j", async (query) => {
    const risposta = await chiama(query);
    expect(risposta.status).toBe(400);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("426 senza header di versione", async () => {
    expect((await chiama("?epoca=2", null)).status).toBe(426);
  });

  it("403 FORBIDDEN se le RLS negano", async () => {
    leggiRoseGaraMock.mockRejectedValue(new RosaForbiddenError());
    const risposta = await chiama();
    expect(risposta.status).toBe(403);
    expect((await risposta.json()).error.code).toBe("FORBIDDEN");
  });

  it("500 INTERNAL se la lettura fallisce o manca la configurazione", async () => {
    leggiRoseGaraMock.mockRejectedValue(new Error("db"));
    expect((await chiama()).status).toBe(500);
    creaClientMock.mockReturnValue(null);
    expect((await chiama()).status).toBe(500);
  });
});

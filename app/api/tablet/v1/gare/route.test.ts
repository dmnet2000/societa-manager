import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autenticaTabletMock = vi.fn();
const elencaGareTabletMock = vi.fn();

vi.mock("@/lib/api-tablet/autenticazione", () => ({
  autenticaTablet: autenticaTabletMock,
}));
vi.mock("@/lib/api-tablet/gare-tablet", () => ({
  elencaGareTablet: elencaGareTabletMock,
}));

const { GET } = await import("./route");

function richiesta(authorization?: string, versione: string | null = "1") {
  const headers: Record<string, string> = {};
  if (authorization) headers["authorization"] = authorization;
  if (versione !== null) headers[HEADER_VERSIONE_APP] = versione;
  return new Request("https://example.test/api/tablet/v1/gare", { headers });
}

describe("GET /api/tablet/v1/gare", () => {
  beforeEach(() => {
    autenticaTabletMock.mockReset();
    elencaGareTabletMock.mockReset();
    elencaGareTabletMock.mockResolvedValue([]);
    vi.unstubAllEnvs();
  });

  it("200 { gare: [] } per un tablet senza assegnazioni", async () => {
    autenticaTabletMock.mockResolvedValue({ ok: true, utente: { id: "u-1" }, utenteId: "ut-1" });

    const risposta = await GET(richiesta("Bearer a.b.c"));

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ gare: [] });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
  });

  // Story 2.6: le gare del tablet chiamante, lette con il suo id Utente.
  it("200 con le gare del tablet chiamante", async () => {
    const gara = {
      garaId: "p-1",
      epoca: 2,
      numero: 1,
      categoria: "Under 14",
      casa: "A",
      ospite: "B",
      data: null,
      ora: null,
      luogo: null,
    };
    autenticaTabletMock.mockResolvedValue({ ok: true, utente: { id: "u-1" }, utenteId: "ut-1" });
    elencaGareTabletMock.mockResolvedValue([gara]);

    const risposta = await GET(richiesta("Bearer a.b.c"));

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ gare: [gara] });
    expect(elencaGareTabletMock).toHaveBeenCalledWith("ut-1");
  });

  it("500 INTERNAL se l'elenco non si legge", async () => {
    autenticaTabletMock.mockResolvedValue({ ok: true, utente: { id: "u-1" }, utenteId: "ut-1" });
    elencaGareTabletMock.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const risposta = await GET(richiesta("Bearer a.b.c"));

    expect(risposta.status).toBe(500);
    expect((await risposta.json()).error.code).toBe("INTERNAL");
    expect(risposta.headers.get("cache-control")).toBe("no-store");
  });

  it("restituisce il 403 FORBIDDEN dell'autenticazione senza leggere le gare", async () => {
    autenticaTabletMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json({ error: { code: "FORBIDDEN", message: "x" } }, { status: 403 }),
    });

    const risposta = await GET(richiesta("Bearer a.b.c"));

    expect(risposta.status).toBe(403);
    expect(elencaGareTabletMock).not.toHaveBeenCalled();
  });

  it("restituisce la risposta 401 dell'autenticazione, senza redirect", async () => {
    autenticaTabletMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json(
        { error: { code: "NON_AUTENTICATO", message: "x" } },
        { status: 401 }
      ),
    });

    const risposta = await GET(richiesta());

    expect(risposta.status).toBe(401);
    expect(risposta.headers.get("location")).toBeNull();
    expect(await risposta.json()).toEqual({
      error: { code: "NON_AUTENTICATO", message: "x" },
    });
  });

  it("426 APP_OBSOLETA sotto il minimo, senza toccare l'autenticazione", async () => {
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "2");

    const risposta = await GET(richiesta("Bearer a.b.c", "1"));

    expect(risposta.status).toBe(426);
    expect((await risposta.json()).error.code).toBe("APP_OBSOLETA");
    expect(autenticaTabletMock).not.toHaveBeenCalled();
  });

  it.each([[null], ["abc"], ["0"], ["-1"]])(
    "426 APP_OBSOLETA con header %s, prima dell'autenticazione",
    async (versione) => {
      const risposta = await GET(richiesta("Bearer a.b.c", versione));

      expect(risposta.status).toBe(426);
      expect((await risposta.json()).error.code).toBe("APP_OBSOLETA");
      expect(autenticaTabletMock).not.toHaveBeenCalled();
    }
  );
});

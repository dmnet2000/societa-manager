import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autenticaTabletMock = vi.fn();

vi.mock("@/lib/api-tablet/autenticazione", () => ({
  autenticaTablet: autenticaTabletMock,
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
    vi.unstubAllEnvs();
  });

  it("200 { gare: [] } con versione e token validi", async () => {
    autenticaTabletMock.mockResolvedValue({ ok: true, utente: { id: "u-1" } });

    const risposta = await GET(richiesta("Bearer a.b.c"));

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ gare: [] });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
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

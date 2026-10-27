import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const autenticaTabletMock = vi.fn();

vi.mock("@/lib/api-tablet/autenticazione", () => ({
  autenticaTablet: autenticaTabletMock,
}));

const { GET } = await import("./route");

function richiesta(authorization?: string) {
  return new Request("https://example.test/api/tablet/v1/gare", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("GET /api/tablet/v1/gare", () => {
  beforeEach(() => {
    autenticaTabletMock.mockReset();
  });

  it("200 { gare: [] } con un token valido", async () => {
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
});

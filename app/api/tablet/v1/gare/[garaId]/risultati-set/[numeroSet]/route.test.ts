import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autorizzaMock = vi.fn();
const salvaRisultatoSetMock = vi.fn();

vi.mock("@/lib/api-tablet/gare-tablet", () => ({ autorizzaGaraTablet: autorizzaMock }));
vi.mock("@/lib/referto-in-corso", () => ({ salvaRisultatoSet: salvaRisultatoSetMock }));

const { PUT } = await import("./route");

const REGISTRO = "123e4567-e89b-42d3-a456-426614174000";
const CORPO = { registroId: REGISTRO, casa: 25, ospite: 20, seqFinale: 50 };

function chiama(opzioni: { numeroSet?: string; query?: string; corpo?: unknown; testo?: string } = {}) {
  const { numeroSet = "1", query = "?epoca=2", corpo = CORPO, testo } = opzioni;
  const request = new Request(
    `https://example.test/api/tablet/v1/gare/p-1/risultati-set/${numeroSet}${query}`,
    {
      method: "PUT",
      headers: { authorization: "Bearer a.b.c", [HEADER_VERSIONE_APP]: "1", "content-type": "application/json" },
      body: testo ?? JSON.stringify(corpo),
    }
  );
  return PUT(request, { params: Promise.resolve({ garaId: "p-1", numeroSet }) });
}

describe("PUT /api/tablet/v1/gare/{garaId}/risultati-set/{numeroSet}", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", jwt: "a.b.c", garaId: "p-1", epoca: 2 });
    salvaRisultatoSetMock.mockResolvedValue({ numeroSet: 1, casa: 25, ospite: 20, seqFinale: 50 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("200 con la riga salvata", async () => {
    const risposta = await chiama({ numeroSet: "3" });
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ numeroSet: 1, casa: 25, ospite: 20, seqFinale: 50 });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(salvaRisultatoSetMock).toHaveBeenCalledWith("p-1", 2, 3, CORPO);
  });

  it("200 con la riga piu' recente quando l'invio e' vecchio", async () => {
    salvaRisultatoSetMock.mockResolvedValue({ numeroSet: 1, casa: 25, ospite: 23, seqFinale: 90 });
    const risposta = await chiama();
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ numeroSet: 1, casa: 25, ospite: 23, seqFinale: 90 });
  });

  it("426 senza header di versione dell'app", async () => {
    const request = new Request("https://example.test/api/tablet/v1/gare/p-1/risultati-set/1?epoca=2", {
      method: "PUT",
      headers: { authorization: "Bearer a.b.c" },
      body: JSON.stringify(CORPO),
    });
    const risposta = await PUT(request, { params: Promise.resolve({ garaId: "p-1", numeroSet: "1" }) });
    expect(risposta.status).toBe(426);
    expect(autorizzaMock).not.toHaveBeenCalled();
    expect(salvaRisultatoSetMock).not.toHaveBeenCalled();
  });

  it("400 con epoca non valida, senza autorizzare", async () => {
    expect((await chiama({ query: "" })).status).toBe(400);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("409 RIASSEGNATA: niente salvato", async () => {
    autorizzaMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json({ error: { code: "RIASSEGNATA", message: "x" } }, { status: 409 }),
    });
    const risposta = await chiama();
    expect(risposta.status).toBe(409);
    expect((await risposta.json()).error.code).toBe("RIASSEGNATA");
    expect(salvaRisultatoSetMock).not.toHaveBeenCalled();
  });

  it.each(["0", "6", "x", "1.5"])("400 VALIDATION con numeroSet %s", async (numeroSet) => {
    const risposta = await chiama({ numeroSet });
    expect(risposta.status).toBe(400);
    expect((await risposta.json()).error.code).toBe("VALIDATION");
    expect(salvaRisultatoSetMock).not.toHaveBeenCalled();
  });

  it("400 con JSON rotto o corpo non valido", async () => {
    expect((await chiama({ testo: "{rotto" })).status).toBe(400);
    expect((await chiama({ corpo: { ...CORPO, casa: -1 } })).status).toBe(400);
    expect((await chiama({ corpo: { ...CORPO, registroId: "x" } })).status).toBe(400);
    expect(salvaRisultatoSetMock).not.toHaveBeenCalled();
  });

  it("500 INTERNAL su errore inatteso, senza dettagli", async () => {
    salvaRisultatoSetMock.mockRejectedValue(new Error("db password"));
    const risposta = await chiama();
    expect(risposta.status).toBe(500);
    const corpo = await risposta.json();
    expect(corpo.error.code).toBe("INTERNAL");
    expect(JSON.stringify(corpo)).not.toContain("password");
  });
});

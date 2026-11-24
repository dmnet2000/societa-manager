import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autorizzaMock = vi.fn();
const creaClientMock = vi.fn();
const salvaRosaGaraMock = vi.fn();

vi.mock("@/lib/api-tablet/gare-tablet", () => ({ autorizzaGaraTablet: autorizzaMock }));
vi.mock("@/lib/api-tablet/client-supabase-tablet", () => ({ creaClientSupabaseTablet: creaClientMock }));
vi.mock("@/lib/rose-gara", () => ({ salvaRosaGara: salvaRosaGaraMock }));

const { PUT } = await import("./route");
const { RosaForbiddenError, RosaValidationError } = await import("@/lib/db-rls/rosa");

const ID = "123e4567-e89b-42d3-a456-426614174000";
const CORPO = {
  versioneBase: 1,
  idModifica: ID,
  giocatori: [{ numero: 4, nome: "Anna", cognome: "Rossi", capitano: true, libero: true }],
  tesserati: [{ ruolo: "A", nome: "Luca" }],
};

function chiama(opzioni: { lato?: string; query?: string; corpo?: unknown; testo?: string } = {}) {
  const { lato = "casa", query = "?epoca=2", corpo = CORPO, testo } = opzioni;
  const request = new Request(`https://example.test/api/tablet/v1/gare/p-1/rose/${lato}${query}`, {
    method: "PUT",
    headers: { authorization: "Bearer a.b.c", [HEADER_VERSIONE_APP]: "1", "content-type": "application/json" },
    body: testo ?? JSON.stringify(corpo),
  });
  return PUT(request, { params: Promise.resolve({ garaId: "p-1", lato }) });
}

describe("PUT /api/tablet/v1/gare/{garaId}/rose/{lato}", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", jwt: "a.b.c", garaId: "p-1", epoca: 2 });
    creaClientMock.mockReturnValue({ marker: "client" });
    salvaRosaGaraMock.mockResolvedValue({ esito: "ok", versione: 2 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("200 { versione } e salva sul lato richiesto", async () => {
    const risposta = await chiama({ lato: "ospite" });

    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ versione: 2 });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(salvaRosaGaraMock).toHaveBeenCalledWith({ marker: "client" }, { garaId: "p-1", lato: "ospite", ...CORPO });
  });

  it("200 con la stessa versione quando idModifica si ripete", async () => {
    salvaRosaGaraMock.mockResolvedValue({ esito: "ok", versione: 2 });
    const prima = await chiama();
    const seconda = await chiama();
    expect(seconda.status).toBe(200);
    expect(await seconda.json()).toEqual(await prima.json());
  });

  it("426 senza header di versione dell'app", async () => {
    const request = new Request("https://example.test/api/tablet/v1/gare/p-1/rose/casa?epoca=2", {
      method: "PUT",
      headers: { authorization: "Bearer a.b.c" },
      body: JSON.stringify(CORPO),
    });
    const risposta = await PUT(request, { params: Promise.resolve({ garaId: "p-1", lato: "casa" }) });
    expect(risposta.status).toBe(426);
    expect(salvaRosaGaraMock).not.toHaveBeenCalled();
  });

  it("409 CONFLITTO", async () => {
    salvaRosaGaraMock.mockResolvedValue({ esito: "conflitto", versione: 4 });
    const risposta = await chiama();
    expect(risposta.status).toBe(409);
    expect((await risposta.json()).error.code).toBe("CONFLITTO");
  });

  it("409 RIASSEGNATA: niente salvato", async () => {
    autorizzaMock.mockResolvedValue({
      ok: false,
      risposta: NextResponse.json({ error: { code: "RIASSEGNATA", message: "x" } }, { status: 409 }),
    });
    const risposta = await chiama();
    expect((await risposta.json()).error.code).toBe("RIASSEGNATA");
    expect(salvaRosaGaraMock).not.toHaveBeenCalled();
  });

  it("400 VALIDATION con lato sbagliato, senza autorizzare", async () => {
    const risposta = await chiama({ lato: "arbitro" });
    expect(risposta.status).toBe(400);
    expect((await risposta.json()).error.code).toBe("VALIDATION");
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("400 con epoca non valida", async () => {
    expect((await chiama({ query: "" })).status).toBe(400);
  });

  it("400 con JSON rotto o corpo non valido", async () => {
    expect((await chiama({ testo: "{rotto" })).status).toBe(400);
    expect((await chiama({ corpo: { ...CORPO, idModifica: "x" } })).status).toBe(400);
    expect(salvaRosaGaraMock).not.toHaveBeenCalled();
  });

  it("400 con il messaggio italiano delle regole del formato", async () => {
    salvaRosaGaraMock.mockRejectedValue(new RosaValidationError("La rosa può avere al massimo 14 giocatori."));
    const risposta = await chiama();
    expect(risposta.status).toBe(400);
    expect((await risposta.json()).error.message).toBe("La rosa può avere al massimo 14 giocatori.");
  });

  it("400 generico se il messaggio viene dal database", async () => {
    salvaRosaGaraMock.mockRejectedValue(new RosaValidationError("VALIDATION: numero duplicato"));
    const corpo = await (await chiama()).json();
    expect(corpo.error.code).toBe("VALIDATION");
    expect(corpo.error.message).toBe("Rosa non valida.");
  });

  it("403 FORBIDDEN dalle RLS", async () => {
    salvaRosaGaraMock.mockRejectedValue(new RosaForbiddenError());
    const risposta = await chiama();
    expect(risposta.status).toBe(403);
    expect((await risposta.json()).error.code).toBe("FORBIDDEN");
  });

  it("500 INTERNAL su errore inatteso o configurazione mancante", async () => {
    salvaRosaGaraMock.mockRejectedValue(new Error("db"));
    expect((await chiama()).status).toBe(500);
    creaClientMock.mockReturnValue(null);
    expect((await chiama()).status).toBe(500);
  });
});

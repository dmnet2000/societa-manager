import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { HEADER_VERSIONE_APP } from "@/lib/api-tablet/contratto";

vi.mock("server-only", () => ({}));

const autorizzaMock = vi.fn();
const salvaBackupMock = vi.fn();
const leggiBackupMock = vi.fn();

vi.mock("@/lib/api-tablet/gare-tablet", () => ({ autorizzaGaraTablet: autorizzaMock }));
vi.mock("@/lib/referto-in-corso", () => ({ salvaBackup: salvaBackupMock, leggiBackup: leggiBackupMock }));

const { PUT, GET } = await import("./route");

const REGISTRO = "123e4567-e89b-42d3-a456-426614174000";
const CORPO = { registroId: REGISTRO, ultimoSeq: 10, hash: "a".repeat(64), blob: "SEGRETO-NOME" };
const PARAMS = { params: Promise.resolve({ garaId: "p-1" }) };

function chiamaPut(opzioni: { query?: string; corpo?: unknown; testo?: string } = {}) {
  const { query = "?epoca=2", corpo = CORPO, testo } = opzioni;
  const request = new Request(`https://example.test/api/tablet/v1/gare/p-1/backup${query}`, {
    method: "PUT",
    headers: { authorization: "Bearer a.b.c", [HEADER_VERSIONE_APP]: "1", "content-type": "application/json" },
    body: testo ?? JSON.stringify(corpo),
  });
  return PUT(request, PARAMS);
}

function chiamaGet(query = "?epoca=2") {
  const request = new Request(`https://example.test/api/tablet/v1/gare/p-1/backup${query}`, {
    method: "GET",
    headers: { authorization: "Bearer a.b.c", [HEADER_VERSIONE_APP]: "1" },
  });
  return GET(request, PARAMS);
}

function riassegnata() {
  return {
    ok: false,
    risposta: NextResponse.json({ error: { code: "RIASSEGNATA", message: "x" } }, { status: 409 }),
  };
}

describe("PUT /api/tablet/v1/gare/{garaId}/backup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", jwt: "a.b.c", garaId: "p-1", epoca: 2 });
    salvaBackupMock.mockResolvedValue({ esito: "ok", salvato: { registroId: REGISTRO, ultimoSeq: 10 } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("200 con il backup salvato", async () => {
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ registroId: REGISTRO, ultimoSeq: 10 });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(salvaBackupMock).toHaveBeenCalledWith("p-1", 2, CORPO);
  });

  it("200 con il backup salvato piu' recente quando l'invio e' vecchio", async () => {
    salvaBackupMock.mockResolvedValue({ esito: "ok", salvato: { registroId: REGISTRO, ultimoSeq: 99 } });
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ registroId: REGISTRO, ultimoSeq: 99 });
  });

  it("426 senza header di versione dell'app", async () => {
    const request = new Request("https://example.test/api/tablet/v1/gare/p-1/backup?epoca=2", {
      method: "PUT",
      headers: { authorization: "Bearer a.b.c" },
      body: JSON.stringify(CORPO),
    });
    const risposta = await PUT(request, PARAMS);
    expect(risposta.status).toBe(426);
    expect(autorizzaMock).not.toHaveBeenCalled();
    expect(salvaBackupMock).not.toHaveBeenCalled();
  });

  it("400 con epoca non valida, senza autorizzare", async () => {
    expect((await chiamaPut({ query: "" })).status).toBe(400);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("409 RIASSEGNATA: niente salvato", async () => {
    autorizzaMock.mockResolvedValue(riassegnata());
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(409);
    expect((await risposta.json()).error.code).toBe("RIASSEGNATA");
    expect(salvaBackupMock).not.toHaveBeenCalled();
  });

  it("400 con JSON rotto o corpo non valido", async () => {
    expect((await chiamaPut({ testo: "{rotto" })).status).toBe(400);
    expect((await chiamaPut({ corpo: { ...CORPO, hash: "x" } })).status).toBe(400);
    expect((await chiamaPut({ corpo: { ...CORPO, blob: "" } })).status).toBe(400);
    expect((await chiamaPut({ corpo: { ...CORPO, blob: "x".repeat(2_000_001) } })).status).toBe(400);
    expect((await chiamaPut({ corpo: { ...CORPO, registroId: "x" } })).status).toBe(400);
    expect(salvaBackupMock).not.toHaveBeenCalled();
  });

  it("400 VALIDATION se l'hash non coincide con il blob", async () => {
    salvaBackupMock.mockResolvedValue({ esito: "hash-errato" });
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(400);
    expect((await risposta.json()).error.code).toBe("VALIDATION");
  });

  it("409 CONFLITTO con un altro registro nella stessa epoca", async () => {
    salvaBackupMock.mockResolvedValue({ esito: "conflitto" });
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(409);
    expect((await risposta.json()).error.code).toBe("CONFLITTO");
  });

  it("500 INTERNAL su errore inatteso, senza dettagli ne' blob nei log", async () => {
    salvaBackupMock.mockRejectedValue(new Error("db password SEGRETO-NOME"));
    const risposta = await chiamaPut();
    expect(risposta.status).toBe(500);
    const corpo = await risposta.json();
    expect(corpo.error.code).toBe("INTERNAL");
    expect(JSON.stringify(corpo)).not.toContain("password");
    const log = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(log).not.toContain("SEGRETO-NOME");
    expect(log).not.toContain("password");
  });
});

describe("GET /api/tablet/v1/gare/{garaId}/backup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    autorizzaMock.mockResolvedValue({ ok: true, utente: {}, utenteId: "ut-1", jwt: "a.b.c", garaId: "p-1", epoca: 2 });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("200 con il backup della gara", async () => {
    const backup = { registroId: REGISTRO, epoca: 2, ultimoSeq: 10, hash: "a".repeat(64), blob: "b" };
    leggiBackupMock.mockResolvedValue(backup);
    const risposta = await chiamaGet();
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ backup });
    expect(risposta.headers.get("cache-control")).toBe("no-store");
    expect(leggiBackupMock).toHaveBeenCalledWith("p-1");
  });

  it("200 { backup: null } senza backup", async () => {
    leggiBackupMock.mockResolvedValue(null);
    const risposta = await chiamaGet();
    expect(risposta.status).toBe(200);
    expect(await risposta.json()).toEqual({ backup: null });
  });

  it("426 senza header di versione", async () => {
    const request = new Request("https://example.test/api/tablet/v1/gare/p-1/backup?epoca=2", {
      headers: { authorization: "Bearer a.b.c" },
    });
    expect((await GET(request, PARAMS)).status).toBe(426);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("400 con epoca non valida", async () => {
    expect((await chiamaGet("")).status).toBe(400);
    expect(autorizzaMock).not.toHaveBeenCalled();
  });

  it("409 RIASSEGNATA", async () => {
    autorizzaMock.mockResolvedValue(riassegnata());
    const risposta = await chiamaGet();
    expect(risposta.status).toBe(409);
    expect(leggiBackupMock).not.toHaveBeenCalled();
  });

  it("500 INTERNAL su errore inatteso", async () => {
    leggiBackupMock.mockRejectedValue(new Error("db"));
    const risposta = await chiamaGet();
    expect(risposta.status).toBe(500);
    expect((await risposta.json()).error.code).toBe("INTERNAL");
  });
});

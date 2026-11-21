import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const { leggiEpocaRichiesta } = await import("./epoca-richiesta");

const rich = (query: string) => new Request(`https://example.test/x${query}`);

describe("leggiEpocaRichiesta", () => {
  it("legge un intero positivo", () => {
    expect(leggiEpocaRichiesta(rich("?epoca=7"))).toEqual({ ok: true, epoca: 7 });
  });

  it.each(["", "?epoca=", "?epoca=0", "?epoca=-1", "?epoca=1.5", "?epoca=abc", "?epoca=99999999999999999999"])(
    "rifiuta %j con 400 VALIDATION",
    async (query) => {
      const esito = leggiEpocaRichiesta(rich(query));
      expect(esito.ok).toBe(false);
      if (esito.ok) return;
      expect(esito.risposta.status).toBe(400);
      expect(await esito.risposta.json()).toEqual({
        error: { code: "VALIDATION", message: "Epoca mancante o non valida." },
      });
    }
  );
});

import { describe, expect, it } from "vitest";
import {
  classificaBucket,
  classificaLettura,
  citaIdentificatore,
  codiceUscita,
  confrontaGare,
  leggiEnv,
  riepilogo,
} from "./logica.mjs";

describe("classificaLettura", () => {
  it.each([401, 403, 404])("HTTP %d: negata", (status) => {
    expect(classificaLettura({ status, corpo: { message: "x" }, righeNelDb: 5 })).toBe("negata");
  });

  it("codice Postgres 42501 (permission denied): negata", () => {
    expect(classificaLettura({ status: 400, corpo: { code: "42501" }, righeNelDb: 5 })).toBe("negata");
  });

  it("RLS che filtra: [] con righe nel database -> vuota", () => {
    expect(classificaLettura({ status: 200, corpo: [], righeNelDb: 5 })).toBe("vuota");
  });

  it("tabella vuota: [] senza righe -> non verificabile", () => {
    expect(classificaLettura({ status: 200, corpo: [], righeNelDb: 0 })).toBe("non-verificabile");
  });

  it("almeno una riga restituita: letta", () => {
    expect(classificaLettura({ status: 200, corpo: [{ id: 1 }], righeNelDb: 5 })).toBe("letta");
  });

  it("risposta inattesa (500): non verificabile, mai negata per errore", () => {
    expect(classificaLettura({ status: 500, corpo: { message: "x" }, righeNelDb: 5 })).toBe(
      "non-verificabile"
    );
  });
});

describe("classificaBucket", () => {
  it("elenco con oggetti: letta", () => {
    expect(classificaBucket({ status: 200, corpo: [{ name: "f.pdf" }], oggettiNelDb: 3 })).toBe("letta");
  });

  it("elenco vuoto con oggetti nel bucket: vuota", () => {
    expect(classificaBucket({ status: 200, corpo: [], oggettiNelDb: 3 })).toBe("vuota");
  });

  it("bucket vuoto: non verificabile", () => {
    expect(classificaBucket({ status: 200, corpo: [], oggettiNelDb: 0 })).toBe("non-verificabile");
  });

  it.each([401, 403, 404])("HTTP %d: negata", (status) => {
    expect(classificaBucket({ status, corpo: { error: "x" }, oggettiNelDb: 3 })).toBe("negata");
  });

  it("HTTP 400 con statusCode 403 nel corpo (stile Storage): negata", () => {
    expect(classificaBucket({ status: 400, corpo: { statusCode: "403" }, oggettiNelDb: 3 })).toBe("negata");
  });

  it.each([
    [400, { error: "richiesta malformata" }],
    [429, { error: "troppe richieste" }],
    [500, { error: "x" }],
  ])("HTTP %d senza codice di accesso: non verificabile, mai negata per errore", (status, corpo) => {
    expect(classificaBucket({ status, corpo, oggettiNelDb: 3 })).toBe("non-verificabile");
  });
});

describe("confrontaGare", () => {
  it("stesso insieme: ok", () => {
    expect(confrontaGare(["g1", "g2"], ["g2", "g1"])).toEqual({ ok: true, inPiu: [], mancanti: [] });
  });

  it("gara in piu' dall'API: fallimento con l'id", () => {
    expect(confrontaGare(["g1", "g2"], ["g1"])).toEqual({ ok: false, inPiu: ["g2"], mancanti: [] });
  });

  it("gara assegnata ma non restituita: fallimento", () => {
    expect(confrontaGare([], ["g1"])).toEqual({ ok: false, inPiu: [], mancanti: ["g1"] });
  });

  it("gara duplicata: fallimento", () => {
    expect(confrontaGare(["g1", "g1"], ["g1"]).ok).toBe(false);
  });
});

describe("codiceUscita e riepilogo", () => {
  const sani = [
    { voce: "public.atlete", chi: "tablet", esito: "negata" as const },
    { voce: "public.vuota", chi: "tablet", esito: "non-verificabile" as const },
    { voce: "gare", chi: "api", esito: "ok" as const },
  ];

  it("senza fallimenti: 0, con le non verificabili elencate", () => {
    expect(codiceUscita(sani)).toBe(0);
    const testo = riepilogo(sani);
    expect(testo).toContain("public.vuota");
    expect(testo).toContain("ESITO: nessuna lettura riuscita");
  });

  it("una lettura riuscita o un controllo fallito: 1, elencati nei fallimenti", () => {
    const controlli = [
      ...sani,
      { voce: "public.certificati", chi: "anon", esito: "letta" as const },
      { voce: "disattivazione", chi: "api", esito: "fallita" as const, dettaglio: "HTTP 200" },
    ];
    expect(codiceUscita(controlli)).toBe(1);
    const testo = riepilogo(controlli, ["public.fn()"]);
    expect(testo).toContain("public.certificati [anon] letta");
    expect(testo).toContain("disattivazione [api] fallita - HTTP 200");
    expect(testo).toContain("public.fn()");
    expect(testo).toContain("ESITO: 2 fallimenti");
  });
});

describe("leggiEnv", () => {
  it("legge chiavi, ignora commenti, toglie \\r e virgolette, l'ultima vince", () => {
    const testo = '# c\r\nA=1\r\nB="due = 2"\r\n\r\nA=3\nC=\'x\'\nrotta\n';
    expect(leggiEnv(testo)).toEqual({ A: "3", B: "due = 2", C: "x" });
  });
});

describe("citaIdentificatore", () => {
  it("cita e raddoppia le virgolette", () => {
    expect(citaIdentificatore('ta"b')).toBe('"ta""b"');
  });
});

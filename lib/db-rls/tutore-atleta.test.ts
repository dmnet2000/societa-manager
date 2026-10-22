import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Fake minimale di supabase-js: ogni chiamata a from() crea un builder che
// registra metodo+argomenti e, quando viene atteso, risolve con il prossimo
// risultato della coda. Basta a verificare ordine e contenuto delle
// operazioni senza dipendere dai dettagli interni di PostgREST.
type Chiamata = { tabella: string; passi: Array<[string, unknown[]]> };
let chiamate: Chiamata[] = [];
let risultati: Array<{ data?: unknown; error: { message: string } | null }> = [];

function builder(tabella: string) {
  const chiamata: Chiamata = { tabella, passi: [] };
  chiamate.push(chiamata);
  const b: Record<string, unknown> = {};
  for (const metodo of ["select", "insert", "update", "delete", "eq", "in", "order"]) {
    b[metodo] = (...args: unknown[]) => {
      chiamata.passi.push([metodo, args]);
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(risultati.shift() ?? { data: null, error: null }).then(resolve, reject);
  return b;
}

const supabase = { from: vi.fn((t: string) => builder(t)) } as never;

const { elencaTutori, salvaTutoriAtleta } = await import("./tutore-atleta");

const dati = (override: Record<string, unknown> = {}) => ({
  nome: "ROSSI MARIO",
  codiceFiscale: "RSSMRA70A01H501U",
  luogoNascita: "Roma",
  dataNascita: new Date("1970-01-01T00:00:00.000Z"),
  indirizzo: null,
  cap: null,
  localitaResidenza: null,
  provinciaResidenza: null,
  email: "mario@example.com",
  telefono: null,
  intestatarioRicevuta: false,
  utenteId: null,
  ...override,
});

function metodi(c: Chiamata) {
  return c.passi.map(([m]) => m);
}

beforeEach(() => {
  chiamate = [];
  risultati = [];
});

describe("elencaTutori", () => {
  it("legge tutori_atleta ordinata per atletaId e posizione", async () => {
    risultati.push({ data: [{ id: "t1" }], error: null });

    const righe = await elencaTutori(supabase);

    expect(righe).toEqual([{ id: "t1" }]);
    expect(chiamate[0].tabella).toBe("tutori_atleta");
    expect(chiamate[0].passi.filter(([m]) => m === "order").map(([, a]) => a[0])).toEqual([
      "atletaId",
      "posizione",
    ]);
  });

  it("propaga l'errore", async () => {
    risultati.push({ data: null, error: { message: "boom" } });
    await expect(elencaTutori(supabase)).rejects.toThrow("boom");
  });
});

describe("salvaTutoriAtleta", () => {
  it("inserisce 2 nuove righe con id generato e updatedAt esplicito", async () => {
    risultati.push({ data: [], error: null }); // lettura posizioni esistenti
    risultati.push({ error: null }); // reset intestatario
    risultati.push({ error: null }); // insert 1
    risultati.push({ error: null }); // insert 2

    await salvaTutoriAtleta(supabase, "atleta-1", [
      { posizione: 1, dati: dati({ intestatarioRicevuta: true }) },
      { posizione: 2, dati: dati({ nome: "BIANCHI ANNA" }) },
    ]);

    expect(chiamate.map(metodi)).toEqual([
      ["select", "eq"],
      ["update", "eq", "eq"],
      ["insert"],
      ["insert"],
    ]);
    const riga1 = chiamate[2].passi[0][1][0] as Record<string, unknown>;
    expect(riga1).toMatchObject({
      atletaId: "atleta-1",
      posizione: 1,
      nome: "ROSSI MARIO",
      intestatarioRicevuta: true,
      dataNascita: "1970-01-01T00:00:00.000Z",
    });
    expect(riga1.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof riga1.updatedAt).toBe("string");
  });

  it("svuotando lo slot 2 elimina solo la riga in posizione 2 e aggiorna la 1 senza toccarne id", async () => {
    risultati.push({ data: [{ posizione: 1 }, { posizione: 2 }], error: null });
    risultati.push({ error: null }); // delete
    risultati.push({ error: null }); // reset
    risultati.push({ data: [{ id: "t1" }], error: null }); // update 1

    await salvaTutoriAtleta(supabase, "atleta-1", [
      { posizione: 1, dati: dati() },
      { posizione: 2, dati: null },
    ]);

    expect(chiamate.map(metodi)).toEqual([
      ["select", "eq"],
      ["delete", "eq", "in"],
      ["update", "eq", "eq"],
      ["update", "eq", "eq", "select"],
    ]);
    expect(chiamate[1].passi[2][1]).toEqual(["posizione", [2]]);
    const aggiornamento = chiamate[3].passi[0][1][0] as Record<string, unknown>;
    expect(aggiornamento).not.toHaveProperty("id");
    expect(aggiornamento).not.toHaveProperty("createdAt");
    expect(chiamate[3].passi.slice(1, 3).map(([, a]) => a)).toEqual([
      ["atletaId", "atleta-1"],
      ["posizione", 1],
    ]);
  });

  it("azzera intestatarioRicevuta prima di qualunque scrittura (indice unico parziale)", async () => {
    risultati.push({ data: [{ posizione: 1 }, { posizione: 2 }], error: null });
    risultati.push({ error: null });
    risultati.push({ data: [{ id: "t1" }], error: null });
    risultati.push({ data: [{ id: "t2" }], error: null });

    await salvaTutoriAtleta(supabase, "atleta-1", [
      { posizione: 1, dati: dati() },
      { posizione: 2, dati: dati({ intestatarioRicevuta: true }) },
    ]);

    const reset = chiamate[1];
    expect(reset.passi[0]).toEqual([
      "update",
      [expect.objectContaining({ intestatarioRicevuta: false })],
    ]);
    expect(reset.passi[2][1]).toEqual(["intestatarioRicevuta", true]);
  });

  it("non elimina nulla se lo slot vuoto non ha una riga esistente", async () => {
    risultati.push({ data: [], error: null });
    risultati.push({ error: null });

    await salvaTutoriAtleta(supabase, "atleta-1", [
      { posizione: 1, dati: null },
      { posizione: 2, dati: null },
    ]);

    expect(chiamate.map(metodi)).toEqual([
      ["select", "eq"],
      ["update", "eq", "eq"],
    ]);
  });

  it("lancia se un update non tocca alcuna riga (RLS)", async () => {
    risultati.push({ data: [{ posizione: 1 }], error: null });
    risultati.push({ error: null });
    risultati.push({ data: [], error: null });

    await expect(
      salvaTutoriAtleta(supabase, "atleta-1", [
        { posizione: 1, dati: dati() },
        { posizione: 2, dati: null },
      ])
    ).rejects.toThrow("Nessuna riga aggiornata");
  });

  it("propaga l'errore di un insert", async () => {
    risultati.push({ data: [], error: null });
    risultati.push({ error: null });
    risultati.push({ error: { message: "insert failed" } });

    await expect(
      salvaTutoriAtleta(supabase, "atleta-1", [{ posizione: 1, dati: dati() }])
    ).rejects.toThrow("insert failed");
  });
  it("scambio dell'intestatario da posizione 1 a 2: il reset avviene prima di entrambe le update", async () => {
    risultati.push({ data: [{ posizione: 1 }, { posizione: 2 }], error: null });
    risultati.push({ error: null }); // reset
    risultati.push({ data: [{ id: "t1" }], error: null });
    risultati.push({ data: [{ id: "t2" }], error: null });

    await salvaTutoriAtleta(supabase, "atleta-1", [
      { posizione: 1, dati: dati({ intestatarioRicevuta: false }) },
      { posizione: 2, dati: dati({ nome: "BIANCHI ANNA", intestatarioRicevuta: true }) },
    ]);

    const indiceReset = chiamate.findIndex((c) =>
      c.passi.some(([m, a]) => m === "eq" && a[0] === "intestatarioRicevuta")
    );
    const indiciUpdate = chiamate
      .map((c, i) => (c.passi.some(([m, a]) => m === "eq" && a[0] === "posizione") ? i : -1))
      .filter((i) => i >= 0);
    expect(indiceReset).toBe(1);
    expect(indiciUpdate).toEqual([2, 3]);
    expect(chiamate[2].passi[0][1][0]).toMatchObject({ intestatarioRicevuta: false });
    expect(chiamate[3].passi[0][1][0]).toMatchObject({ intestatarioRicevuta: true });
  });

  it("propaga l'errore della lettura iniziale, nessuna scrittura", async () => {
    risultati.push({ data: null, error: { message: "read failed" } });

    await expect(
      salvaTutoriAtleta(supabase, "atleta-1", [{ posizione: 1, dati: dati() }])
    ).rejects.toThrow("read failed");
    expect(chiamate).toHaveLength(1);
  });

  it("propaga l'errore della delete, nessuna scrittura successiva", async () => {
    risultati.push({ data: [{ posizione: 2 }], error: null });
    risultati.push({ error: { message: "delete failed" } });

    await expect(
      salvaTutoriAtleta(supabase, "atleta-1", [
        { posizione: 1, dati: dati() },
        { posizione: 2, dati: null },
      ])
    ).rejects.toThrow("delete failed");
    expect(chiamate).toHaveLength(2);
  });

  it("propaga l'errore del reset intestatario, nessuna scrittura successiva", async () => {
    risultati.push({ data: [], error: null });
    risultati.push({ error: { message: "reset failed" } });

    await expect(
      salvaTutoriAtleta(supabase, "atleta-1", [{ posizione: 1, dati: dati() }])
    ).rejects.toThrow("reset failed");
    expect(chiamate).toHaveLength(2);
  });
});

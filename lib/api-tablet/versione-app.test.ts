import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const { verificaVersioneApp } = await import("./versione-app");

function richiesta(versione?: string) {
  return new Request("https://example.test/api/tablet/v1/gare", {
    headers: versione === undefined ? undefined : { "X-App-Versione": versione },
  });
}

async function attesoObsoleta(esito: ReturnType<typeof verificaVersioneApp>) {
  expect(esito.ok).toBe(false);
  if (esito.ok) throw new Error("atteso rifiuto");
  expect(esito.risposta.status).toBe(426);
  expect(esito.risposta.headers.get("cache-control")).toBe("no-store");
  const corpo = await esito.risposta.json();
  expect(corpo.error.code).toBe("APP_OBSOLETA");
  return corpo.error.message as string;
}

describe("verificaVersioneApp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("minimo assente = 1: la versione 1 passa", () => {
    expect(verificaVersioneApp(richiesta("1"))).toEqual({ ok: true });
  });

  it("versione uguale o sopra il minimo passa", () => {
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "2");
    expect(verificaVersioneApp(richiesta("2")).ok).toBe(true);
    expect(verificaVersioneApp(richiesta("3")).ok).toBe(true);
  });

  it("versione sotto il minimo: 426 APP_OBSOLETA", async () => {
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "2");
    await attesoObsoleta(verificaVersioneApp(richiesta("1")));
  });

  it.each([[undefined], ["abc"], ["0"], ["-1"], [""]])(
    "header %j: 426 APP_OBSOLETA (fail-closed)",
    async (versione) => {
      await attesoObsoleta(verificaVersioneApp(richiesta(versione)));
    }
  );

  it("senza TABLET_APK_URL il messaggio rimanda all'organizzatore e non contiene URL", async () => {
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "2");
    const messaggio = await attesoObsoleta(verificaVersioneApp(richiesta("1")));
    expect(messaggio).toContain("organizzatore");
    expect(messaggio).not.toMatch(/https?:/);
  });

  it("con TABLET_APK_URL il messaggio la cita", async () => {
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "2");
    vi.stubEnv("TABLET_APK_URL", "https://apk.esempio.test/referto.apk");
    const messaggio = await attesoObsoleta(verificaVersioneApp(richiesta("1")));
    expect(messaggio).toContain("https://apk.esempio.test/referto.apk");
  });

  it("minimo non valido: usa 1 e avvisa nel log", () => {
    const avviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("TABLET_APP_VERSIONE_MINIMA", "boh");
    expect(verificaVersioneApp(richiesta("1")).ok).toBe(true);
    expect(avviso).toHaveBeenCalled();
  });
});

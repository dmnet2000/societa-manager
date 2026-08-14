import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const maybeSingleMock = vi.fn();
const selectQueryMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({
  select: selectQueryMock,
  upsert: upsertMock,
}));

const supabase = { from: fromMock } as never;

const {
  leggiConfigurazioneSocialFacebook,
  salvaTokenFacebook,
  aggiornaStatoLetturaFacebook,
  rimuoviToken,
  ID_CONFIGURAZIONE_SOCIAL_FACEBOOK,
} = await import("./configurazione-social-facebook");

const rigaCompleta = {
  id: ID_CONFIGURAZIONE_SOCIAL_FACEBOOK,
  accessToken: "EAAG...segreto",
  ultimaLetturaOk: true,
  ultimoErrore: null,
};

describe("leggiConfigurazioneSocialFacebook", () => {
  beforeEach(() => {
    fromMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it("restituisce la riga esistente", async () => {
    maybeSingleMock.mockResolvedValue({ data: rigaCompleta, error: null });

    const risultato = await leggiConfigurazioneSocialFacebook(supabase);

    expect(fromMock).toHaveBeenCalledWith("configurazione_social_facebook");
    expect(selectQueryMock).toHaveBeenCalledWith("*");
    expect(risultato).toEqual(rigaCompleta);
  });

  it("restituisce null quando nessuna configurazione esiste ancora", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const risultato = await leggiConfigurazioneSocialFacebook(supabase);

    expect(risultato).toBeNull();
  });

  it("throws when the query fails (incluso un rifiuto RLS, AC #4/#6)", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(leggiConfigurazioneSocialFacebook(supabase)).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("salvaTokenFacebook", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("fa upsert su un id fisso, sempre lo stesso (nessuna race condition possibile)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await salvaTokenFacebook(supabase, "EAAG...nuovo");

    expect(fromMock).toHaveBeenCalledWith("configurazione_social_facebook");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opzioni] = upsertMock.mock.calls[0];
    expect(payload.id).toBe(ID_CONFIGURAZIONE_SOCIAL_FACEBOOK);
    expect(payload.accessToken).toBe("EAAG...nuovo");
    expect(opzioni).toEqual({ onConflict: "id" });
  });

  it("resetta ultimaLetturaOk a true e ultimoErrore a null (non deve restare l'avviso del token precedente)", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await salvaTokenFacebook(supabase, "EAAG...nuovo");

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.ultimaLetturaOk).toBe(true);
    expect(payload.ultimoErrore).toBeNull();
  });

  it("throws when the upsert fails (incluso un rifiuto RLS)", async () => {
    upsertMock.mockResolvedValue({
      error: { message: "new row violates row-level security policy" },
    });

    await expect(salvaTokenFacebook(supabase, "x")).rejects.toThrow(
      "row-level security"
    );
  });
});

describe("aggiornaStatoLetturaFacebook", () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset();
  });

  it("scrive esito positivo senza toccare accessToken nel payload", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await aggiornaStatoLetturaFacebook(supabase, {
      ultimaLetturaOk: true,
      ultimoErrore: null,
    });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("accessToken");
    expect(payload.ultimaLetturaOk).toBe(true);
    expect(payload.ultimoErrore).toBeNull();
  });

  it("scrive esito negativo con messaggio di errore", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await aggiornaStatoLetturaFacebook(supabase, {
      ultimaLetturaOk: false,
      ultimoErrore: "HTTP 401",
    });

    const payload = upsertMock.mock.calls[0][0];
    expect(payload.ultimaLetturaOk).toBe(false);
    expect(payload.ultimoErrore).toBe("HTTP 401");
  });

  it("throws when the upsert fails", async () => {
    upsertMock.mockResolvedValue({
      error: { message: "connection error" },
    });

    await expect(
      aggiornaStatoLetturaFacebook(supabase, { ultimaLetturaOk: false, ultimoErrore: "x" })
    ).rejects.toThrow("connection error");
  });
});

describe("rimuoviToken", () => {
  it("restituisce l'oggetto senza la chiave accessToken (AC #4)", () => {
    const risultato = rimuoviToken(rigaCompleta);

    expect(risultato).not.toHaveProperty("accessToken");
    expect(risultato).toEqual({
      id: ID_CONFIGURAZIONE_SOCIAL_FACEBOOK,
      ultimaLetturaOk: true,
      ultimoErrore: null,
    });
  });
});

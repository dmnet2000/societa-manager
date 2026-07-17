import { describe, expect, it, vi, beforeEach } from "vitest";

const signUpMock = vi.fn();
const utenteCreateMock = vi.fn();
const sincronizzaRuoliMock = vi.fn();
const trovaAllenatorePerCodiceFiscaleMock = vi.fn();
const allenatoreUpdateMock = vi.fn();
const trovaPerCodiceFiscaleMock = vi.fn();
const genitoreAtletaCreateMock = vi.fn();
const createAdminClientMock = vi.fn(() => ({}));
const redirectMock = vi.fn(() => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signUp: signUpMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    utente: { create: utenteCreateMock },
    allenatore: { update: allenatoreUpdateMock },
    genitoreAtleta: { create: genitoreAtletaCreateMock },
  },
}));

vi.mock("@/lib/auth-admin/sync-roles", () => ({
  sincronizzaRuoliAppMetadata: sincronizzaRuoliMock,
}));

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/matching-codice-fiscale", async () => {
  const { isCodiceFiscaleValido } = await vi.importActual<
    typeof import("@/lib/matching-codice-fiscale/valida-codice-fiscale")
  >("@/lib/matching-codice-fiscale/valida-codice-fiscale");
  return {
    trovaAllenatorePerCodiceFiscale: trovaAllenatorePerCodiceFiscaleMock,
    trovaPerCodiceFiscale: trovaPerCodiceFiscaleMock,
    isCodiceFiscaleValido,
  };
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { registrati } = await import("./actions");

function buildFormData(fields: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
    } else {
      formData.append(key, value);
    }
  }
  return formData;
}

describe("registrati", () => {
  beforeEach(() => {
    signUpMock.mockReset();
    utenteCreateMock.mockReset();
    sincronizzaRuoliMock.mockReset();
    trovaAllenatorePerCodiceFiscaleMock.mockReset();
    allenatoreUpdateMock.mockReset();
    trovaPerCodiceFiscaleMock.mockReset();
    genitoreAtletaCreateMock.mockReset();
    createAdminClientMock.mockClear();
    redirectMock.mockClear();
  });

  it("returns an error when no ruolo is selected", async () => {
    const result = await registrati(
      undefined,
      buildFormData({ email: "a@example.com", password: "pw123456" })
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." },
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when signUp returns empty identities (AC #4)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1", identities: [] } },
      error: null,
    });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when signUp returns a user_already_exists error (AC #4)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error when signUp throws unexpectedly, no crash", async () => {
    signUpMock.mockRejectedValue(new Error("network down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "a@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
  });

  it("dedupes duplicate ruolo values before creating the Utente", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u3", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u3" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "dup-ruolo@example.com",
          password: "pw123456",
          ruoli: ["ATLETA", "ATLETA"],
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(utenteCreateMock).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: "u3",
        email: "dup-ruolo@example.com",
        ruoli: { create: [{ ruolo: "ATLETA" }] },
      },
    });
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("u3", ["ATLETA"]);
  });

  it("returns a friendly error, no crash, when the post-signup sync fails (decided: no automatic rollback)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u4", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u4" });
    sincronizzaRuoliMock.mockRejectedValue(new Error("app_metadata sync failed"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "orfano@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("creates the Utente + Ruoli, syncs app_metadata, and redirects on success (AC #1)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u2", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u2" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "new@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE", "DIRIGENTE"],
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(utenteCreateMock).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: "u2",
        email: "new@example.com",
        ruoli: {
          create: [{ ruolo: "ALLENATORE" }, { ruolo: "DIRIGENTE" }],
        },
      },
    });
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("u2", [
      "ALLENATORE",
      "DIRIGENTE",
    ]);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("hooks up the new Utente to a preloaded Allenatore matching the Codice Fiscale (AC #3)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u5", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u5" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-1",
      codiceFiscale: "ABC123",
      utenteId: null,
    });
    allenatoreUpdateMock.mockResolvedValue({});

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "allenatore@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE"],
          codiceFiscaleAllenatore: "abc123",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(trovaAllenatorePerCodiceFiscaleMock).toHaveBeenCalledWith("ABC123");
    expect(allenatoreUpdateMock).toHaveBeenCalledWith({
      where: { id: "allenatore-1" },
      data: { utenteId: "utente-u5" },
    });
  });

  it("does not look up any Allenatore when no Codice Fiscale is provided (AC #4)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u6", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u6" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "senza-cf@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE"],
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("does not look up any Allenatore when the Ruolo Allenatore is not selected, even with a Codice Fiscale", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u7", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u7" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "atleta@example.com",
          password: "pw123456",
          ruoli: ["ATLETA"],
          codiceFiscaleAllenatore: "ABC123",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("registers successfully without hooking up when the Codice Fiscale matches no preloaded Allenatore (AC #4)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u8", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u8" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "nessun-precaricamento@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE"],
          codiceFiscaleAllenatore: "SCONOSCIUTO",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(allenatoreUpdateMock).not.toHaveBeenCalled();
  });

  it("does not hook up (and does not crash) when the matching Allenatore is already linked to another account", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u9", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u9" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-2",
      codiceFiscale: "ABC123",
      utenteId: "gia-agganciato",
    });

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "gia-agganciato@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE"],
          codiceFiscaleAllenatore: "ABC123",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(allenatoreUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the Allenatore hookup fails (decided: no automatic rollback)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u10", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u10" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-3",
      codiceFiscale: "ABC123",
      utenteId: null,
    });
    allenatoreUpdateMock.mockRejectedValue(new Error("db down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "hookup-fallito@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE"],
        codiceFiscaleAllenatore: "ABC123",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when Ruolo Genitore is selected without a Codice Fiscale figlio (AC #2)", async () => {
    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il Codice Fiscale della figlia/o è obbligatorio per il Ruolo Genitore.",
      },
    });
    expect(signUpMock).not.toHaveBeenCalled();
    expect(trovaPerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the Genitore lookup throws (fail-closed)", async () => {
    trovaPerCodiceFiscaleMock.mockRejectedValue(new Error("db down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore-errore@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Codice Fiscale figlio has an invalid format", async () => {
    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore-formato-invalido@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "123",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Codice Fiscale della figlia/o non valido (deve essere di 16 caratteri alfanumerici).",
      },
    });
    expect(trovaPerCodiceFiscaleMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and creates no account when the Codice Fiscale figlio matches no Atleta (AC #3)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore-sconosciuto@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "sconosciuto1234x",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il codice corretto.",
      },
    });
    expect(createAdminClientMock).toHaveBeenCalled();
    expect(trovaPerCodiceFiscaleMock).toHaveBeenCalledWith(
      expect.anything(),
      "SCONOSCIUTO1234X"
    );
    expect(signUpMock).not.toHaveBeenCalled();
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("rejects the entire registration, even with another ruolo also selected, when the Codice Fiscale figlio doesn't match (AC #5)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "multi-ruolo@example.com",
        password: "pw123456",
        ruoli: ["GENITORE", "DIRIGENTE"],
        codiceFiscaleFiglio: "SCONOSCIUTO1234X",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il codice corretto.",
      },
    });
    expect(signUpMock).not.toHaveBeenCalled();
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("hooks up the new Utente to the matching Atleta via GenitoreAtleta (AC #1)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-1",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    signUpMock.mockResolvedValue({
      data: { user: { id: "u11", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u11" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "genitore-match@example.com",
          password: "pw123456",
          ruoli: ["GENITORE"],
          codiceFiscaleFiglio: "rssmra10a41h501z",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(trovaPerCodiceFiscaleMock).toHaveBeenCalledWith(
      expect.anything(),
      "RSSMRA10A41H501Z"
    );
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: { utenteId: "utente-u11", atletaId: "atleta-1" },
    });
  });

  it("returns a friendly error, no crash, when the GenitoreAtleta hookup fails (decided: no automatic rollback)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-1",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    signUpMock.mockResolvedValue({
      data: { user: { id: "u13", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u13" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockRejectedValue(new Error("db down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore-hookup-fallito@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("links a second Genitore to the same Atleta without any duplicate error (AC #4)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-condivisa",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    signUpMock.mockResolvedValue({
      data: { user: { id: "genitore-a", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-genitore-a" });
    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "primo-genitore@example.com",
          password: "pw123456",
          ruoli: ["GENITORE"],
          codiceFiscaleFiglio: "RSSMRA10A41H501Z",
        })
      )
    ).rejects.toThrow("REDIRECT");

    signUpMock.mockResolvedValue({
      data: { user: { id: "genitore-b", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-genitore-b" });
    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "secondo-genitore@example.com",
          password: "pw123456",
          ruoli: ["GENITORE"],
          codiceFiscaleFiglio: "RSSMRA10A41H501Z",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(genitoreAtletaCreateMock).toHaveBeenNthCalledWith(1, {
      data: { utenteId: "utente-genitore-a", atletaId: "atleta-condivisa" },
    });
    expect(genitoreAtletaCreateMock).toHaveBeenNthCalledWith(2, {
      data: { utenteId: "utente-genitore-b", atletaId: "atleta-condivisa" },
    });
  });

  it("hooks up both Allenatore and Genitore independently when both ruoli are selected", async () => {
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-multi",
      codiceFiscale: "ABC1234567890123",
      utenteId: null,
    });
    allenatoreUpdateMock.mockResolvedValue({});
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-multi",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    genitoreAtletaCreateMock.mockResolvedValue({});
    signUpMock.mockResolvedValue({
      data: { user: { id: "u12", identities: [{ id: "id1" }] } },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u12" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await expect(
      registrati(
        undefined,
        buildFormData({
          email: "doppio-ruolo@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE", "GENITORE"],
          codiceFiscaleAllenatore: "ABC1234567890123",
          codiceFiscaleFiglio: "RSSMRA10A41H501Z",
        })
      )
    ).rejects.toThrow("REDIRECT");

    expect(allenatoreUpdateMock).toHaveBeenCalledWith({
      where: { id: "allenatore-multi" },
      data: { utenteId: "utente-u12" },
    });
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: { utenteId: "utente-u12", atletaId: "atleta-multi" },
    });
  });
});

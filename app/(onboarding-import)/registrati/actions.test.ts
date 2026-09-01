import { describe, expect, it, vi, beforeEach } from "vitest";

const generateLinkMock = vi.fn();
const inviaEmailMock = vi.fn();
const headersMock = vi.fn();
const utenteCreateMock = vi.fn();
const utenteFindUniqueMock = vi.fn();
const utenteCountMock = vi.fn();
const sincronizzaRuoliMock = vi.fn();
const trovaAllenatorePerCodiceFiscaleMock = vi.fn();
const allenatoreUpdateMock = vi.fn();
const trovaPerCodiceFiscaleMock = vi.fn();
const genitoreAtletaCreateMock = vi.fn();
const elencaEmailPerRuoloMock = vi.fn();
const trovaPrecaricamentoRuoloMock = vi.fn();
const precaricamentoRuoloUpdateManyMock = vi.fn();
const createAdminClientMock = vi.fn(() => ({
  auth: { admin: { generateLink: generateLinkMock } },
}));

// Story 11.4: signUp() (client di sessione) sostituito da generateLink
// (Admin API, service-role) - stesso mock scaffold di
// recupera-password/actions.test.ts (richiediRecuperoPassword usa gia'
// esattamente questo pattern). inviaEmail/headers mockati allo stesso modo.
// Spec "Gate di conferma Admin": utente.count e elencaEmailPerRuolo aggiunti
// per il gate/notifica sui Ruoli sensibili.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    utente: {
      create: utenteCreateMock,
      findUnique: utenteFindUniqueMock,
      count: utenteCountMock,
    },
    allenatore: { update: allenatoreUpdateMock },
    genitoreAtleta: { create: genitoreAtletaCreateMock },
    precaricamentoRuolo: { updateMany: precaricamentoRuoloUpdateManyMock },
  },
}));

vi.mock("@/lib/auth-admin/sync-roles", () => ({
  sincronizzaRuoliAppMetadata: sincronizzaRuoliMock,
}));

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock("@/lib/email/invia-email", () => ({
  inviaEmail: inviaEmailMock,
}));

vi.mock("@/lib/utenti/email-per-ruolo", () => ({
  elencaEmailPerRuolo: elencaEmailPerRuoloMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
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

// Spec 9.41 (precaricamento Segreteria/Dirigente): mock del modulo di
// matching condiviso - normalizzaEmailRuolo resta l'implementazione reale
// (semplice trim+lowercase, nessun bisogno di mockarla), solo
// trovaPrecaricamentoRuolo e' mockato.
vi.mock("@/lib/matching-email-ruolo", async () => {
  const { normalizzaEmailRuolo } = await vi.importActual<
    typeof import("@/lib/matching-email-ruolo/normalizza-email-ruolo")
  >("@/lib/matching-email-ruolo/normalizza-email-ruolo");
  const { RUOLI_BLOCCATI_SENZA_PRECARICAMENTO } = await vi.importActual<
    typeof import("@/lib/matching-email-ruolo/ruoli-bloccati-senza-precaricamento")
  >("@/lib/matching-email-ruolo/ruoli-bloccati-senza-precaricamento");
  return {
    trovaPrecaricamentoRuolo: trovaPrecaricamentoRuoloMock,
    normalizzaEmailRuolo,
    RUOLI_BLOCCATI_SENZA_PRECARICAMENTO,
  };
});

const { registrati } = await import("./actions");

const MESSAGGIO_SUCCESSO =
  "Registrazione quasi completata: controlla la tua email e apri il link per accedere.";

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

function buildHeaders(entries: Record<string, string>) {
  return new Map(Object.entries(entries));
}

// Shape di successo di generateLink({type:"signup",...}) - properties.hashed_token
// e' l'unico campo letto dal codice (link di conferma), mirror del pattern
// gia' verificato in recupera-password/actions.test.ts.
function generateLinkSuccess(id: string, hashedToken = `token-${id}`) {
  return {
    data: {
      user: { id, identities: [{ id: "id1" }] },
      properties: { hashed_token: hashedToken },
    },
    error: null,
  };
}

describe("registrati", () => {
  beforeEach(() => {
    generateLinkMock.mockReset();
    inviaEmailMock.mockReset();
    inviaEmailMock.mockResolvedValue(undefined);
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      buildHeaders({ host: "app.esempio.it", "x-forwarded-proto": "https" })
    );
    utenteCreateMock.mockReset();
    utenteFindUniqueMock.mockReset();
    utenteFindUniqueMock.mockResolvedValue(null);
    // Default: un Admin attivo gia' esiste - la maggior parte dei test non
    // riguarda il bootstrap, questo evita di dover mockare il conteggio in
    // ogni test che seleziona un Ruolo sensibile.
    utenteCountMock.mockReset();
    utenteCountMock.mockResolvedValue(1);
    sincronizzaRuoliMock.mockReset();
    trovaAllenatorePerCodiceFiscaleMock.mockReset();
    allenatoreUpdateMock.mockReset();
    trovaPerCodiceFiscaleMock.mockReset();
    genitoreAtletaCreateMock.mockReset();
    elencaEmailPerRuoloMock.mockReset();
    elencaEmailPerRuoloMock.mockResolvedValue(["admin@example.com"]);
    createAdminClientMock.mockClear();
    // Default: l'email e' gia' precaricata per qualunque Ruolo bloccato -
    // la maggior parte dei test preesistenti seleziona DIRIGENTE/SEGRETERIA
    // senza voler testare il blocco di precaricamento (Spec 9.41), coperto
    // a parte nel describe dedicato sotto.
    trovaPrecaricamentoRuoloMock.mockReset();
    trovaPrecaricamentoRuoloMock.mockResolvedValue({
      id: "precaricamento-default",
      email: "default@example.com",
      ruolo: "DIRIGENTE",
      utenteId: null,
    });
    precaricamentoRuoloUpdateManyMock.mockReset();
    precaricamentoRuoloUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("returns an error when no ruolo is selected", async () => {
    const result = await registrati(
      undefined,
      buildFormData({ email: "a@example.com", password: "pw123456" })
    );
    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Seleziona almeno un ruolo." },
    });
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when generateLink returns empty identities (AC #4)", async () => {
    generateLinkMock.mockResolvedValue({
      data: {
        user: { id: "u1", identities: [] },
        properties: { hashed_token: "token-u1" },
      },
      error: null,
    });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("returns 'email già registrata' when generateLink returns a user_already_exists error (AC #4)", async () => {
    generateLinkMock.mockResolvedValue({
      data: { user: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dup@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({
      error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email già registrata." },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error when generateLink throws unexpectedly, no crash", async () => {
    generateLinkMock.mockRejectedValue(new Error("network down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "a@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
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
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u3"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u3" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dup-ruolo@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE", "DIRIGENTE"],
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    // Spec 9.41: DIRIGENTE non e' piu' un Ruolo sensibile (gate sostituito
    // dal precaricamento, superato di default nel beforeEach) - attivo:true.
    expect(utenteCreateMock).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: "u3",
        email: "dup-ruolo@example.com",
        attivo: true,
        ruoli: { create: [{ ruolo: "DIRIGENTE" }] },
      },
    });
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("u3", ["DIRIGENTE"]);
  });

  it("returns a friendly error, no crash, when the post-signup sync fails (decided: no automatic rollback)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u4"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u4" });
    sincronizzaRuoliMock.mockRejectedValue(new Error("app_metadata sync failed"));

    // Spec 9.41: DIRIGENTE sostituito da SITE_MANAGER - non e' piu' un
    // Ruolo sensibile (vedi commenti nel describe "gate di conferma"
    // sotto), la notifica in questo test richiede un Ruolo che lo sia
    // ancora.
    const result = await registrati(
      undefined,
      buildFormData({
        email: "orfano@example.com",
        password: "pw123456",
        ruoli: ["SITE_MANAGER"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    // Review fix (Blind Hunter): la notifica agli Admin ora corre PRIMA di
    // sincronizzaRuoliAppMetadata (vedi gate di conferma sotto) - un
    // fallimento successivo non deve piu' inghiottirla in silenzio. Qui
    // scatta comunque (Site Manager e' un Ruolo sensibile, un Admin attivo
    // esiste per default nel beforeEach): solo la mail di conferma sotto
    // (che richiede di superare sincronizzaRuoliAppMetadata) non parte.
    expect(inviaEmailMock).toHaveBeenCalledTimes(1);
    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ oggetto: "Nuova registrazione da confermare" })
    );
  });

  it("creates the Utente + Ruoli, syncs app_metadata, and returns success without redirect (AC #1)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u2"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u2" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "new@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE", "DIRIGENTE"],
      })
    );

    // Spec 9.41: DIRIGENTE non e' piu' un Ruolo sensibile - attivo:true
    // (vedi commento gemello sopra).
    expect(utenteCreateMock).toHaveBeenCalledWith({
      data: {
        supabaseAuthId: "u2",
        email: "new@example.com",
        attivo: true,
        ruoli: {
          create: [{ ruolo: "ALLENATORE" }, { ruolo: "DIRIGENTE" }],
        },
      },
    });
    expect(sincronizzaRuoliMock).toHaveBeenCalledWith("u2", [
      "ALLENATORE",
      "DIRIGENTE",
    ]);
    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
  });

  it("sends the confirmation email with a token_hash link built from the request headers (AC #1)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u17", "hash-abc"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u17" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    await registrati(
      undefined,
      buildFormData({
        email: "conferma@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatario: "conferma@example.com",
        testo: expect.stringContaining(
          "https://app.esempio.it/conferma-registrazione?token_hash=hash-abc"
        ),
      })
    );
  });

  it("returns a friendly INTERNAL error, no crash, when generateLink's response is missing hashed_token (review fix)", async () => {
    generateLinkMock.mockResolvedValue({
      data: { user: { id: "u19", identities: [{ id: "id1" }] }, properties: {} },
      error: null,
    });
    utenteCreateMock.mockResolvedValue({ id: "utente-u19" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "risposta-malformata@example.com",
        password: "pw123456",
        // Non un Ruolo sensibile: irrilevante per questo test (hashed_token
        // mancante), ma un Ruolo sensibile avrebbe fatto scattare la
        // notifica Admin (indipendente dal fallimento di costruzione del
        // link testato qui) e reso fuorviante l'asserzione sotto.
        ruoli: ["ALLENATORE"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("returns EMAIL_NON_INVIATA (AC #5) when the confirmation email fails to send, no rollback attempted", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u18"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u18" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    inviaEmailMock.mockRejectedValue(new Error("CONFIGURAZIONE_SMTP_MANCANTE: ..."));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "smtp-rotto@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Registrazione creata ma impossibile inviare l'email di conferma. Riprova tra qualche minuto o contatta la segreteria.",
      },
    });
    // AC #5: nessun rollback - l'Utente e' comunque stato creato prima del fallimento email.
    expect(utenteCreateMock).toHaveBeenCalled();
  });

  // Review fix (code review Story 11.4, decision-needed risolto con l'utente:
  // aggiungere ora un reinvio, invece di limitarsi a correggere i testi):
  // quando generateLink restituisce successo su un Utente Supabase GIA'
  // esistente ma non confermato (email fallita al primo tentativo, o link
  // scaduto), prisma.utente.findUnique lo trova gia' - niente ricreazione,
  // solo un reinvio dell'email con un nuovo token.
  it("resends the confirmation email without recreating Prisma records when the Utente already exists (review fix: no more dead end after a failed/expired first attempt)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u-esistente", "nuovo-hash"));
    utenteFindUniqueMock.mockResolvedValue({ id: "utente-gia-creato" });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "riprovo@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(utenteFindUniqueMock).toHaveBeenCalledWith({
      where: { supabaseAuthId: "u-esistente" },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
    expect(sincronizzaRuoliMock).not.toHaveBeenCalled();
    expect(inviaEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatario: "riprovo@example.com",
        testo: expect.stringContaining(
          "https://app.esempio.it/conferma-registrazione?token_hash=nuovo-hash"
        ),
      })
    );
  });

  it("resend path also returns EMAIL_NON_INVIATA if the resend itself fails to send (AC #5)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u-esistente-2"));
    utenteFindUniqueMock.mockResolvedValue({ id: "utente-gia-creato-2" });
    inviaEmailMock.mockRejectedValue(new Error("CONFIGURAZIONE_SMTP_MANCANTE: ..."));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "riprovo-fallito@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "EMAIL_NON_INVIATA",
        message:
          "Registrazione creata ma impossibile inviare l'email di conferma. Riprova tra qualche minuto o contatta la segreteria.",
      },
    });
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("falls back to attempting Utente creation when the existence check itself fails (fail-soft)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u-check-fallito"));
    utenteFindUniqueMock.mockRejectedValue(new Error("db down"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u-check-fallito" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "check-fallito@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(utenteCreateMock).toHaveBeenCalled();
  });

  it("hooks up the new Utente to a preloaded Allenatore matching the Codice Fiscale (AC #3)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u5"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u5" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-1",
      codiceFiscale: "ABC123",
      utenteId: null,
    });
    allenatoreUpdateMock.mockResolvedValue({});

    const result = await registrati(
      undefined,
      buildFormData({
        email: "allenatore@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE"],
        codiceFiscaleAllenatore: "abc123",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(trovaAllenatorePerCodiceFiscaleMock).toHaveBeenCalledWith("ABC123");
    expect(allenatoreUpdateMock).toHaveBeenCalledWith({
      where: { id: "allenatore-1" },
      data: { utenteId: "utente-u5" },
    });
  });

  it("does not look up any Allenatore when no Codice Fiscale is provided (AC #4)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u6"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u6" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "senza-cf@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE"],
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("does not look up any Allenatore when the Ruolo Allenatore is not selected, even with a Codice Fiscale", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u7"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u7" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "dirigente@example.com",
        password: "pw123456",
        ruoli: ["DIRIGENTE"],
        codiceFiscaleAllenatore: "ABC123",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(trovaAllenatorePerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("registers successfully without hooking up when the Codice Fiscale matches no preloaded Allenatore (AC #4)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u8"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u8" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue(null);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "nessun-precaricamento@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE"],
        codiceFiscaleAllenatore: "SCONOSCIUTO",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(allenatoreUpdateMock).not.toHaveBeenCalled();
  });

  it("does not hook up (and does not crash) when the matching Allenatore is already linked to another account", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u9"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u9" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    trovaAllenatorePerCodiceFiscaleMock.mockResolvedValue({
      id: "allenatore-2",
      codiceFiscale: "ABC123",
      utenteId: "gia-agganciato",
    });

    const result = await registrati(
      undefined,
      buildFormData({
        email: "gia-agganciato@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE"],
        codiceFiscaleAllenatore: "ABC123",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(allenatoreUpdateMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the Allenatore hookup fails (decided: no automatic rollback)", async () => {
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u10"));
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
    expect(inviaEmailMock).not.toHaveBeenCalled();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("hooks up the new Utente to the matching Atleta via GenitoreAtleta (AC #1)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-1",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u11"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u11" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    const result = await registrati(
      undefined,
      buildFormData({
        email: "genitore-match@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "rssmra10a41h501z",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
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
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u13"));
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
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("links a second Genitore to the same Atleta without any duplicate error (AC #4)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-condivisa",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    generateLinkMock.mockResolvedValue(generateLinkSuccess("genitore-a"));
    utenteCreateMock.mockResolvedValue({ id: "utente-genitore-a" });
    const primoRisultato = await registrati(
      undefined,
      buildFormData({
        email: "primo-genitore@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "RSSMRA10A41H501Z",
      })
    );
    expect(primoRisultato).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });

    generateLinkMock.mockResolvedValue(generateLinkSuccess("genitore-b"));
    utenteCreateMock.mockResolvedValue({ id: "utente-genitore-b" });
    const secondoRisultato = await registrati(
      undefined,
      buildFormData({
        email: "secondo-genitore@example.com",
        password: "pw123456",
        ruoli: ["GENITORE"],
        codiceFiscaleFiglio: "RSSMRA10A41H501Z",
      })
    );
    expect(secondoRisultato).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });

    expect(genitoreAtletaCreateMock).toHaveBeenNthCalledWith(1, {
      data: { utenteId: "utente-genitore-a", atletaId: "atleta-condivisa" },
    });
    expect(genitoreAtletaCreateMock).toHaveBeenNthCalledWith(2, {
      data: { utenteId: "utente-genitore-b", atletaId: "atleta-condivisa" },
    });
  });

  it("returns a validation error when Ruolo Atleta is selected without a Codice Fiscale (Story 2.7 AC #2)", async () => {
    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-senza-cf@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Il tuo Codice Fiscale è obbligatorio per il Ruolo Atleta.",
      },
    });
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(trovaPerCodiceFiscaleMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when the Codice Fiscale for Ruolo Atleta has an invalid format", async () => {
    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-formato-invalido@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
        codiceFiscaleAtleta: "123",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).",
      },
    });
    expect(trovaPerCodiceFiscaleMock).not.toHaveBeenCalled();
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error, no crash, when the Atleta lookup throws (fail-closed)", async () => {
    trovaPerCodiceFiscaleMock.mockRejectedValue(new Error("db down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-errore@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
        codiceFiscaleAtleta: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it("returns a validation error and creates no account when the Codice Fiscale for Ruolo Atleta matches no Atleta (Story 2.7 AC #2)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue(null);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-sconosciuta@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
        codiceFiscaleAtleta: "sconosciuto1234x",
      })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message:
          "Nessuna Atleta trovata con questo Codice Fiscale. Verifica di aver inserito il tuo Codice Fiscale corretto.",
      },
    });
    expect(createAdminClientMock).toHaveBeenCalled();
    expect(trovaPerCodiceFiscaleMock).toHaveBeenCalledWith(
      expect.anything(),
      "SCONOSCIUTO1234X"
    );
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(utenteCreateMock).not.toHaveBeenCalled();
  });

  it("hooks up the new Utente (Ruolo Atleta) to her own Atleta via GenitoreAtleta (Story 2.7 AC #1)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-propria",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u14"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u14" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-match@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
        codiceFiscaleAtleta: "rssmra10a41h501z",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(trovaPerCodiceFiscaleMock).toHaveBeenCalledWith(
      expect.anything(),
      "RSSMRA10A41H501Z"
    );
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: {
        utenteId: "utente-u14",
        atletaId: "atleta-propria",
        autoAggancio: true,
      },
    });
  });

  it("returns a friendly error, no crash, when the Atleta self-hookup fails (decided: no automatic rollback)", async () => {
    trovaPerCodiceFiscaleMock.mockResolvedValue({
      id: "atleta-propria",
      codiceFiscale: "RSSMRA10A41H501Z",
    });
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u15"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u15" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockRejectedValue(new Error("db down"));

    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-hookup-fallito@example.com",
        password: "pw123456",
        ruoli: ["ATLETA"],
        codiceFiscaleAtleta: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile completare la registrazione. Riprova.",
      },
    });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("hooks up both Atleta (self) and Genitore (child) independently when both ruoli are selected", async () => {
    trovaPerCodiceFiscaleMock.mockImplementation(async (_client, cf: string) => {
      if (cf === "SELFCF0000000001") {
        return { id: "atleta-se-stessa", codiceFiscale: cf };
      }
      if (cf === "FIGLIOCF00000002") {
        return { id: "atleta-figlio", codiceFiscale: cf };
      }
      return null;
    });
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u16"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u16" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);
    genitoreAtletaCreateMock.mockResolvedValue({});

    const result = await registrati(
      undefined,
      buildFormData({
        email: "atleta-e-genitore@example.com",
        password: "pw123456",
        ruoli: ["ATLETA", "GENITORE"],
        codiceFiscaleAtleta: "selfcf0000000001",
        codiceFiscaleFiglio: "figliocf00000002",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: {
        utenteId: "utente-u16",
        atletaId: "atleta-se-stessa",
        autoAggancio: true,
      },
    });
    // Review fix (Story 3.2): l'aggancio Genitore<->figlia NON deve mai
    // avere autoAggancio true - e' esattamente cio' che impediva ad AC #3 di
    // essere rispettato (un Genitore poteva altrimenti leggere lo storico
    // presenze della figlia tramite la policy RLS pensata per l'Atleta).
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: { utenteId: "utente-u16", atletaId: "atleta-figlio" },
    });
    expect(genitoreAtletaCreateMock).toHaveBeenCalledTimes(2);
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
    generateLinkMock.mockResolvedValue(generateLinkSuccess("u12"));
    utenteCreateMock.mockResolvedValue({ id: "utente-u12" });
    sincronizzaRuoliMock.mockResolvedValue(undefined);

    const result = await registrati(
      undefined,
      buildFormData({
        email: "doppio-ruolo@example.com",
        password: "pw123456",
        ruoli: ["ALLENATORE", "GENITORE"],
        codiceFiscaleAllenatore: "ABC1234567890123",
        codiceFiscaleFiglio: "RSSMRA10A41H501Z",
      })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(allenatoreUpdateMock).toHaveBeenCalledWith({
      where: { id: "allenatore-multi" },
      data: { utenteId: "utente-u12" },
    });
    expect(genitoreAtletaCreateMock).toHaveBeenCalledWith({
      data: { utenteId: "utente-u12", atletaId: "atleta-multi" },
    });
  });

  // Spec "Gate di conferma Admin per l'auto-registrazione di Ruoli
  // sensibili": ADMIN/SITE_MANAGER non hanno alcun aggancio a un record
  // preesistente via Codice Fiscale ne' un precaricamento (Story 9.41) -
  // registrati() deve crearli con attivo:false e notificare gli Admin
  // attivi, tranne nel caso di bootstrap (nessun Admin attivo nel sistema).
  // Review fix (Acceptance Auditor): DIRIGENTE/SEGRETERIA erano elencati qui
  // ma non sono piu' sotto questo gate dalla Story 9.41 (sostituiti dal gate
  // di precaricamento, testato a parte sotto) - commento disallineato dal
  // corpo dei test, che gia' usa SITE_MANAGER al loro posto (vedi sotto).
  describe("gate di conferma per Ruoli sensibili", () => {
    it("keeps attivo:true and sends no Admin notification when only Ruoli with a Codice Fiscale hookup are selected", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-1"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-1" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "solo-allenatore@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: true }) })
      );
      expect(elencaEmailPerRuoloMock).not.toHaveBeenCalled();
      expect(inviaEmailMock).toHaveBeenCalledTimes(1); // solo l'email di conferma
    });

    it("creates the Utente as attivo:false and notifies active Admins when a Ruolo sensibile is selected and active Admins already exist", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-2"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-2" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(1);
      elencaEmailPerRuoloMock.mockResolvedValue(["admin1@example.com", "admin2@example.com"]);

      // Spec 9.41: SEGRETERIA/DIRIGENTE non sono piu' "Ruoli sensibili"
      // (sostituiti dal gate di precaricamento, testato a parte) - questo
      // test usa ora SITE_MANAGER, l'unico Ruolo rimasto senza aggancio CF
      // ne' precaricamento, per continuare a verificare il gate originale.
      const result = await registrati(
        undefined,
        buildFormData({
          email: "nuovo-site-manager@example.com",
          password: "pw123456",
          ruoli: ["SITE_MANAGER"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: false }) })
      );
      expect(elencaEmailPerRuoloMock).toHaveBeenCalledWith("ADMIN");
      expect(inviaEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatario: ["admin1@example.com", "admin2@example.com"],
        })
      );
    });

    it("gates a self-registered ADMIN exactly like any other Ruolo sensibile when an active Admin already exists (no exception)", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-3"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-3" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(1);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "nuovo-admin@example.com",
          password: "pw123456",
          ruoli: ["ADMIN"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: false }) })
      );
      expect(elencaEmailPerRuoloMock).toHaveBeenCalledWith("ADMIN");
    });

    it("bootstraps the first ADMIN as attivo:true immediately, with no notification, when zero active Admins exist in the system", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-4"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-4" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(0);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "primo-admin@example.com",
          password: "pw123456",
          ruoli: ["ADMIN"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: true }) })
      );
      expect(elencaEmailPerRuoloMock).not.toHaveBeenCalled();
      expect(inviaEmailMock).toHaveBeenCalledTimes(1); // solo l'email di conferma, nessuna notifica
    });

    it("gates registration (attivo:false) when just one of several selected Ruoli is sensibile", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-5"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-5" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(1);

      // Spec 9.41: DIRIGENTE sostituito da SITE_MANAGER (vedi commento
      // gemello sopra) - resta comunque un Ruolo senza aggancio CF misto a
      // uno con aggancio CF (ALLENATORE).
      const result = await registrati(
        undefined,
        buildFormData({
          email: "misto@example.com",
          password: "pw123456",
          ruoli: ["ALLENATORE", "SITE_MANAGER"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: false }) })
      );
    });

    it("completes the registration successfully even when the Admin notification email fails to send (fail-soft, no rollback)", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-6"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-6" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(1);
      // La notifica Admin (oggetto distinto) fallisce, l'email di conferma
      // (chiamata successiva, oggetto diverso) va invece a buon fine - il
      // fail-soft riguarda solo la notifica, non l'intera registrazione.
      inviaEmailMock.mockImplementation(async ({ oggetto }: { oggetto: string }) => {
        if (oggetto === "Nuova registrazione da confermare") {
          throw new Error("SMTP down");
        }
      });

      // Spec 9.41: DIRIGENTE sostituito da SITE_MANAGER (vedi commento
      // gemello sopra nel primo test del describe).
      const result = await registrati(
        undefined,
        buildFormData({
          email: "notifica-fallita@example.com",
          password: "pw123456",
          ruoli: ["SITE_MANAGER"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalled();
      expect(inviaEmailMock).toHaveBeenCalledTimes(2);
    });

    it("does not re-run the gate/notification on the resend path (utenteEsistente already present)", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-7"));
      utenteFindUniqueMock.mockResolvedValue({ id: "utente-gia-creato-gate" });

      const result = await registrati(
        undefined,
        buildFormData({
          email: "reinvio-dirigente@example.com",
          password: "pw123456",
          ruoli: ["DIRIGENTE"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).not.toHaveBeenCalled();
      expect(utenteCountMock).not.toHaveBeenCalled();
      expect(elencaEmailPerRuoloMock).not.toHaveBeenCalled();
      expect(inviaEmailMock).toHaveBeenCalledTimes(1); // solo il reinvio della conferma
    });

    // Review fix (Blind Hunter + Edge Case Hunter): limite noto e accettato,
    // non risolto - documenta il comportamento attuale invece di lasciarlo
    // non testato. Una registrazione con un Ruolo sensibile diverso da Admin,
    // mentre zero Admin sono attivi, resta attivo:false senza alcuna
    // notifica possibile (elencaEmailPerRuolo restituisce un elenco vuoto,
    // inviaEmail non viene nemmeno provata). Vedi deferred-work.md.
    it("leaves a non-Admin Ruolo sensibile gated with no notification when zero active Admins exist (documented limitation)", async () => {
      generateLinkMock.mockResolvedValue(generateLinkSuccess("gate-8"));
      utenteCreateMock.mockResolvedValue({ id: "utente-gate-8" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(0);
      elencaEmailPerRuoloMock.mockResolvedValue([]);

      // Spec 9.41: SEGRETERIA sostituita da SITE_MANAGER (vedi commento
      // gemello sopra nel primo test del describe) - il limite documentato
      // qui riguarda ancora un Ruolo sensibile diverso da Admin.
      const result = await registrati(
        undefined,
        buildFormData({
          email: "site-manager-senza-admin@example.com",
          password: "pw123456",
          ruoli: ["SITE_MANAGER"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: false }) })
      );
      expect(elencaEmailPerRuoloMock).toHaveBeenCalledWith("ADMIN");
      expect(inviaEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({ destinatario: [] })
      );
    });
  });

  // Spec 9.41 "Precaricamento email per Segreteria e Dirigente (blocco
  // registrazione)": a differenza del gate "Ruoli sensibili" sopra (che
  // crea comunque l'account, attivo:false, in attesa di attivazione
  // manuale), Segreteria/Dirigente sono bloccati PRIMA di generateLink -
  // nessun account Supabase Auth creato per una registrazione rifiutata.
  describe("precaricamento email per Segreteria/Dirigente (Spec 9.41)", () => {
    it("rejects registration with Segreteria before generateLink when the email has no preloaded row for that Ruolo", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue(null);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "non-precaricata@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA"],
        })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message: "Questa email non è precaricata per il Ruolo Segreteria. Contatta un Admin.",
        },
      });
      expect(trovaPrecaricamentoRuoloMock).toHaveBeenCalledWith(
        "non-precaricata@example.com",
        "SEGRETERIA"
      );
      expect(generateLinkMock).not.toHaveBeenCalled();
      expect(utenteCreateMock).not.toHaveBeenCalled();
    });

    it("rejects registration with Segreteria+Dirigente naming only the missing Ruolo when the email is preloaded for just one of them", async () => {
      trovaPrecaricamentoRuoloMock.mockImplementation(async (_email: string, ruolo: string) =>
        ruolo === "SEGRETERIA"
          ? { id: "p1", email: "solo-segreteria@example.com", ruolo, utenteId: null }
          : null
      );

      const result = await registrati(
        undefined,
        buildFormData({
          email: "solo-segreteria@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA", "DIRIGENTE"],
        })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message: "Questa email non è precaricata per il Ruolo Dirigente. Contatta un Admin.",
        },
      });
      expect(generateLinkMock).not.toHaveBeenCalled();
      expect(utenteCreateMock).not.toHaveBeenCalled();
    });

    it("proceeds, creates the Utente attivo:true and claims the row when the email is preloaded for the selected Ruolo Segreteria", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue({
        id: "p2",
        email: "precaricata@example.com",
        ruolo: "SEGRETERIA",
        utenteId: null,
      });
      generateLinkMock.mockResolvedValue(generateLinkSuccess("precarico-1"));
      utenteCreateMock.mockResolvedValue({ id: "utente-precarico-1" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "precaricata@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: true }) })
      );
      // Nessun gate "Ruoli sensibili" per Segreteria/Dirigente (sostituito
      // dal precaricamento) - nessuna notifica agli Admin.
      expect(elencaEmailPerRuoloMock).not.toHaveBeenCalled();
      expect(precaricamentoRuoloUpdateManyMock).toHaveBeenCalledWith({
        where: { email: "precaricata@example.com", ruolo: "SEGRETERIA", utenteId: null },
        data: { utenteId: "utente-precarico-1" },
      });
    });

    it("does not require any preloading for a non-blocked Ruolo selected alongside Segreteria (e.g. Allenatore)", async () => {
      trovaPrecaricamentoRuoloMock.mockImplementation(async (_email: string, ruolo: string) =>
        ruolo === "SEGRETERIA"
          ? { id: "p3", email: "segreteria-allenatore@example.com", ruolo, utenteId: null }
          : null
      );
      generateLinkMock.mockResolvedValue(generateLinkSuccess("precarico-2"));
      utenteCreateMock.mockResolvedValue({ id: "utente-precarico-2" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "segreteria-allenatore@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA", "ALLENATORE"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      // Solo il Ruolo bloccato (Segreteria) viene controllato - Allenatore
      // non passa mai da trovaPrecaricamentoRuolo.
      expect(trovaPrecaricamentoRuoloMock).toHaveBeenCalledTimes(1);
      expect(trovaPrecaricamentoRuoloMock).toHaveBeenCalledWith(
        "segreteria-allenatore@example.com",
        "SEGRETERIA"
      );
      expect(precaricamentoRuoloUpdateManyMock).toHaveBeenCalledTimes(1);
    });

    it("re-runs the precaricamento check on a resend (always passes, rows still exist) but never re-runs the claim", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue({
        id: "p4",
        email: "reinvio-segreteria@example.com",
        ruolo: "SEGRETERIA",
        utenteId: "gia-agganciato",
      });
      generateLinkMock.mockResolvedValue(generateLinkSuccess("reinvio-precarico"));
      utenteFindUniqueMock.mockResolvedValue({ id: "utente-gia-creato-precarico" });

      const result = await registrati(
        undefined,
        buildFormData({
          email: "reinvio-segreteria@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(trovaPrecaricamentoRuoloMock).toHaveBeenCalledWith(
        "reinvio-segreteria@example.com",
        "SEGRETERIA"
      );
      expect(utenteCreateMock).not.toHaveBeenCalled();
      expect(precaricamentoRuoloUpdateManyMock).not.toHaveBeenCalled();
    });

    it("normalizes the email (trim) before checking preloading, matching what generateLink receives", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue(null);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "  spazi@example.com  ",
          password: "pw123456",
          ruoli: ["DIRIGENTE"],
        })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message: "Questa email non è precaricata per il Ruolo Dirigente. Contatta un Admin.",
        },
      });
      expect(trovaPrecaricamentoRuoloMock).toHaveBeenCalledWith("spazi@example.com", "DIRIGENTE");
    });

    // Review fix (Blind Hunter + Acceptance Auditor): "il Ruolo X, Y" era
    // grammaticalmente errato con piu' di un Ruolo mancante - nessun test
    // esercitava il caso doppio-mancante prima di questo fix.
    it("rejects registration with Segreteria+Dirigente naming both missing Ruoli (plural) when neither is preloaded", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue(null);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "nessuna-precaricata@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA", "DIRIGENTE"],
        })
      );

      expect(result).toEqual({
        error: {
          code: "VALIDATION",
          message:
            "Questa email non è precaricata per i Ruoli Segreteria, Dirigente. Contatta un Admin.",
        },
      });
      expect(generateLinkMock).not.toHaveBeenCalled();
      expect(utenteCreateMock).not.toHaveBeenCalled();
    });

    // Review fix (Acceptance Auditor): scenario esplicito della matrice I/O
    // congelata dello spec ("Registrazione con Segreteria+Admin, email
    // precaricata solo per Segreteria, 0 Admin attivi -> bootstrap Admin:
    // attivo:true per l'eccezione bootstrap, non per il precaricamento") -
    // non ancora coperto da nessun test.
    it("bootstraps the first ADMIN as attivo:true via the bootstrap exception (not the precaricamento gate) when combined with a preloaded Segreteria and zero active Admins", async () => {
      trovaPrecaricamentoRuoloMock.mockResolvedValue({
        id: "p5",
        email: "bootstrap-segreteria@example.com",
        ruolo: "SEGRETERIA",
        utenteId: null,
      });
      generateLinkMock.mockResolvedValue(generateLinkSuccess("bootstrap-precarico"));
      utenteCreateMock.mockResolvedValue({ id: "utente-bootstrap-precarico" });
      sincronizzaRuoliMock.mockResolvedValue(undefined);
      utenteCountMock.mockResolvedValue(0);

      const result = await registrati(
        undefined,
        buildFormData({
          email: "bootstrap-segreteria@example.com",
          password: "pw123456",
          ruoli: ["SEGRETERIA", "ADMIN"],
        })
      );

      expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
      expect(utenteCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ attivo: true }) })
      );
      // Bootstrap (0 Admin attivi), non il precaricamento, spiega
      // attivo:true qui - nessuna notifica agli Admin (bootstrap esenta).
      expect(elencaEmailPerRuoloMock).not.toHaveBeenCalled();
      expect(precaricamentoRuoloUpdateManyMock).toHaveBeenCalledWith({
        where: { email: "bootstrap-segreteria@example.com", ruolo: "SEGRETERIA", utenteId: null },
        data: { utenteId: "utente-bootstrap-precarico" },
      });
    });
  });
});

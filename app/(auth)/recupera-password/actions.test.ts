import { describe, expect, it, vi, beforeEach } from "vitest";

const generateLinkMock = vi.fn();
const inviaEmailMock = vi.fn();
const headersMock = vi.fn();

vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: () => ({
    auth: { admin: { generateLink: generateLinkMock } },
  }),
}));

vi.mock("@/lib/email/invia-email", () => ({
  inviaEmail: inviaEmailMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

const { richiediRecuperoPassword } = await import("./actions");

const MESSAGGIO_SUCCESSO =
  "Se l'indirizzo è registrato, riceverai un'email con le istruzioni per reimpostare la password.";

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

function buildHeaders(entries: Record<string, string>) {
  return new Map(Object.entries(entries));
}

describe("richiediRecuperoPassword", () => {
  beforeEach(() => {
    generateLinkMock.mockReset();
    inviaEmailMock.mockReset();
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      buildHeaders({ host: "app.esempio.it", "x-forwarded-proto": "https" })
    );
  });

  it("returns a validation error when email is missing, no Supabase call", async () => {
    const result = await richiediRecuperoPassword(undefined, buildFormData({}));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'email è obbligatoria." },
    });
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it("returns the generic success message even when the email does not match any account (anti-enumeration)", async () => {
    generateLinkMock.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });

    const result = await richiediRecuperoPassword(
      undefined,
      buildFormData({ email: "sconosciuto@esempio.it" })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("pads the nonexistent-email branch to a minimum duration (review fix: anti-enumeration timing side-channel)", async () => {
    generateLinkMock.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });

    const inizio = Date.now();
    await richiediRecuperoPassword(undefined, buildFormData({ email: "sconosciuto@esempio.it" }));
    const trascorso = Date.now() - inizio;

    expect(trascorso).toBeGreaterThanOrEqual(280);
  });

  it("sends the recovery email with a link built from the request host and the hashed token when generateLink succeeds", async () => {
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "abc123" }, user: {} },
      error: null,
    });
    inviaEmailMock.mockResolvedValue(undefined);

    const result = await richiediRecuperoPassword(
      undefined,
      buildFormData({ email: "utente@esempio.it" })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
    expect(generateLinkMock).toHaveBeenCalledWith({
      type: "recovery",
      email: "utente@esempio.it",
    });
    expect(inviaEmailMock).toHaveBeenCalledTimes(1);
    const chiamata = inviaEmailMock.mock.calls[0][0];
    expect(chiamata.destinatario).toBe("utente@esempio.it");
    expect(chiamata.testo).toContain(
      "https://app.esempio.it/reimposta-password?token_hash=abc123"
    );
  });

  it("falls back to https when x-forwarded-proto is absent", async () => {
    headersMock.mockResolvedValue(buildHeaders({ host: "app.esempio.it" }));
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "xyz" }, user: {} },
      error: null,
    });
    inviaEmailMock.mockResolvedValue(undefined);

    await richiediRecuperoPassword(
      undefined,
      buildFormData({ email: "utente@esempio.it" })
    );

    const chiamata = inviaEmailMock.mock.calls[0][0];
    expect(chiamata.testo).toContain("https://app.esempio.it/reimposta-password");
  });

  it("returns the generic success message even when inviaEmail throws (e.g. SMTP not configured), no error leaked", async () => {
    generateLinkMock.mockResolvedValue({
      data: { properties: { hashed_token: "abc123" }, user: {} },
      error: null,
    });
    inviaEmailMock.mockRejectedValue(
      new Error("CONFIGURAZIONE_SMTP_MANCANTE: nessuna configurazione email impostata.")
    );

    const result = await richiediRecuperoPassword(
      undefined,
      buildFormData({ email: "utente@esempio.it" })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
  });

  it("returns the generic success message even when generateLink throws unexpectedly", async () => {
    generateLinkMock.mockRejectedValue(new Error("network down"));

    const result = await richiediRecuperoPassword(
      undefined,
      buildFormData({ email: "utente@esempio.it" })
    );

    expect(result).toEqual({ successo: true, messaggio: MESSAGGIO_SUCCESSO });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const requireRuoloMock = vi.fn();
const createClientMock = vi.fn();
const leggiConfigurazioneSmtpMock = vi.fn();
const salvaConfigurazioneSmtpMock = vi.fn();
const inviaEmailMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/auth/require-ruolo", () => ({
  requireRuolo: requireRuoloMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/db-rls/configurazione-smtp", () => ({
  leggiConfigurazioneSmtp: leggiConfigurazioneSmtpMock,
  salvaConfigurazioneSmtp: salvaConfigurazioneSmtpMock,
}));

vi.mock("@/lib/email/invia-email", () => ({
  inviaEmail: inviaEmailMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { salvaConfigurazione, inviaEmailDiProva } = await import("./actions");

const supabaseFinto = { finto: true };

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [chiave, valore] of Object.entries(fields)) {
    formData.append(chiave, valore);
  }
  return formData;
}

const campiValidi = {
  host: "smtps.aruba.it",
  porta: "465",
  sicura: "on",
  utente: "info@esempio.it",
  password: "segreta123",
  mittente: "info@esempio.it",
  nomeMittente: "Polisportiva",
};

beforeEach(() => {
  requireRuoloMock.mockReset();
  requireRuoloMock.mockResolvedValue(null);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(supabaseFinto);
  leggiConfigurazioneSmtpMock.mockReset();
  leggiConfigurazioneSmtpMock.mockResolvedValue(null);
  salvaConfigurazioneSmtpMock.mockReset();
  salvaConfigurazioneSmtpMock.mockResolvedValue(undefined);
  inviaEmailMock.mockReset();
  inviaEmailMock.mockResolvedValue(undefined);
  revalidatePathMock.mockReset();
});

describe("salvaConfigurazione (Server Action)", () => {
  it("returns FORBIDDEN se il chiamante non e' Admin (AC #5)", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await salvaConfigurazione(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(requireRuoloMock).toHaveBeenCalledWith("ADMIN");
    expect(salvaConfigurazioneSmtpMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando host e' mancante", async () => {
    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, host: "" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Host, utente e mittente sono obbligatori." },
    });
    expect(salvaConfigurazioneSmtpMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando la porta non e' un intero valido", async () => {
    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, porta: "non-un-numero" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La porta deve essere un numero tra 1 e 65535." },
    });
  });

  it("returns VALIDATION quando la porta e' fuori range", async () => {
    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, porta: "99999" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La porta deve essere un numero tra 1 e 65535." },
    });
  });

  it("returns VALIDATION per una porta in notazione scientifica (review fix: Number('1e2') e' un intero valido ma non e' cio' che un Admin si aspetta)", async () => {
    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, porta: "1e2" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "La porta deve essere un numero tra 1 e 65535." },
    });
  });

  it("returns VALIDATION quando il mittente non ha un formato email valido (review fix)", async () => {
    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, mittente: "non-una-email" })
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'indirizzo mittente non è un'email valida." },
    });
    expect(salvaConfigurazioneSmtpMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando la password e' solo spazi bianchi alla prima configurazione (review fix: non deve superare il controllo 'obbligatoria')", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(null);

    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, password: "   " })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La password è obbligatoria per la prima configurazione.",
      },
    });
    expect(salvaConfigurazioneSmtpMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando la password e' vuota e nessuna configurazione esiste ancora (Prerequisito #3)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(null);

    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, password: "" })
    );

    expect(result).toEqual({
      error: {
        code: "VALIDATION",
        message: "La password è obbligatoria per la prima configurazione.",
      },
    });
    expect(salvaConfigurazioneSmtpMock).not.toHaveBeenCalled();
  });

  it("salva con successo quando la password e' vuota ma una configurazione esiste gia' (non la cancella, Prerequisito #3)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue({
      id: "c1",
      host: "vecchio.host.it",
      porta: 587,
      sicura: false,
      utente: "vecchio@esempio.it",
      password: "vecchia",
      mittente: "vecchio@esempio.it",
      nomeMittente: null,
    });

    const result = await salvaConfigurazione(
      undefined,
      buildFormData({ ...campiValidi, password: "" })
    );

    expect(result).toEqual({ success: true });
    expect(salvaConfigurazioneSmtpMock).toHaveBeenCalledWith(
      supabaseFinto,
      expect.objectContaining({ password: "" })
    );
  });

  it("salva con successo con tutti i campi validi, sicura=true, e revalida la pagina (AC #1)", async () => {
    const result = await salvaConfigurazione(undefined, buildFormData(campiValidi));

    expect(result).toEqual({ success: true });
    expect(salvaConfigurazioneSmtpMock).toHaveBeenCalledWith(supabaseFinto, {
      host: "smtps.aruba.it",
      porta: 465,
      sicura: true,
      utente: "info@esempio.it",
      password: "segreta123",
      mittente: "info@esempio.it",
      nomeMittente: "Polisportiva",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/smtp");
  });

  it("sicura=false quando la checkbox non e' presente nel FormData", async () => {
    const senzaCheckbox = { ...campiValidi };
    delete (senzaCheckbox as Record<string, string>).sicura;

    await salvaConfigurazione(undefined, buildFormData(senzaCheckbox));

    expect(salvaConfigurazioneSmtpMock).toHaveBeenCalledWith(
      supabaseFinto,
      expect.objectContaining({ sicura: false })
    );
  });

  it("nomeMittente e' null quando non fornito", async () => {
    const senzaNome = { ...campiValidi };
    delete (senzaNome as Record<string, string>).nomeMittente;

    await salvaConfigurazione(undefined, buildFormData(senzaNome));

    expect(salvaConfigurazioneSmtpMock).toHaveBeenCalledWith(
      supabaseFinto,
      expect.objectContaining({ nomeMittente: null })
    );
  });

  it("returns INTERNAL fail-closed quando salvaConfigurazioneSmtp lancia", async () => {
    salvaConfigurazioneSmtpMock.mockRejectedValue(new Error("db down"));

    const result = await salvaConfigurazione(undefined, buildFormData(campiValidi));

    expect(result).toEqual({
      error: { code: "INTERNAL", message: "Impossibile salvare la configurazione. Riprova." },
    });
  });
});

describe("inviaEmailDiProva (Server Action)", () => {
  function buildFormDataProva(destinatario: string) {
    return buildFormData({ destinatario });
  }

  it("returns FORBIDDEN se il chiamante non e' Admin", async () => {
    requireRuoloMock.mockResolvedValue({
      error: { code: "FORBIDDEN", message: "Non autorizzato." },
    });

    const result = await inviaEmailDiProva(undefined, buildFormDataProva("a@b.it"));

    expect(result).toEqual({ error: { code: "FORBIDDEN", message: "Non autorizzato." } });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il destinatario e' mancante", async () => {
    const result = await inviaEmailDiProva(undefined, buildFormDataProva(""));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Indirizzo destinatario obbligatorio." },
    });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION quando il destinatario non ha un formato email valido (review fix)", async () => {
    const result = await inviaEmailDiProva(
      undefined,
      buildFormDataProva("non-una-email")
    );

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "L'indirizzo destinatario non è un'email valida." },
    });
    expect(inviaEmailMock).not.toHaveBeenCalled();
  });

  it("returns success e chiama inviaEmail con oggetto/testo di prova (AC #3)", async () => {
    const result = await inviaEmailDiProva(undefined, buildFormDataProva("a@b.it"));

    expect(result).toEqual({ success: true });
    expect(inviaEmailMock).toHaveBeenCalledWith(supabaseFinto, {
      destinatario: "a@b.it",
      oggetto: expect.any(String),
      testo: expect.any(String),
    });
  });

  it("returns VALIDATION con messaggio dedicato quando la configurazione manca (AC #4)", async () => {
    inviaEmailMock.mockRejectedValue(new Error("CONFIGURAZIONE_SMTP_MANCANTE: nessuna configurazione."));

    const result = await inviaEmailDiProva(undefined, buildFormDataProva("a@b.it"));

    expect(result).toEqual({
      error: { code: "VALIDATION", message: "Configurazione email non impostata." },
    });
  });

  it("returns INTERNAL per qualunque altro fallimento di invio", async () => {
    inviaEmailMock.mockRejectedValue(new Error("Invalid login: 535"));

    const result = await inviaEmailDiProva(undefined, buildFormDataProva("a@b.it"));

    expect(result).toEqual({
      error: {
        code: "INTERNAL",
        message: "Impossibile inviare l'email di prova. Verifica i parametri.",
      },
    });
  });
});

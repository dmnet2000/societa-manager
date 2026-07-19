import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

const leggiConfigurazioneSmtpMock = vi.fn();
vi.mock("@/lib/db-rls/configurazione-smtp", () => ({
  leggiConfigurazioneSmtp: leggiConfigurazioneSmtpMock,
}));

const adminClientFinto = { admin: "client" };
const createAdminClientMock = vi.fn(() => adminClientFinto);
vi.mock("@/lib/auth-admin/client", () => ({
  createAdminClient: createAdminClientMock,
}));

const { inviaEmail } = await import("./invia-email");

const configurazioneEsempio = {
  id: "c1",
  host: "smtps.aruba.it",
  porta: 465,
  sicura: true,
  utente: "info@esempio.it",
  password: "segreta123",
  mittente: "info@esempio.it",
  nomeMittente: "Polisportiva",
};

describe("inviaEmail", () => {
  beforeEach(() => {
    createTransportMock.mockClear();
    sendMailMock.mockReset();
    leggiConfigurazioneSmtpMock.mockReset();
    createAdminClientMock.mockClear();
  });

  // Review fix (Story 4.3, scoperto in verifica dal vivo): la configurazione
  // deve essere letta col client service-role, mai con la sessione di chi
  // ha innescato l'invio - "configurazione_smtp" ha RLS ADMIN-only (AD-12);
  // un Genitore/Atleta che carica un Certificato avrebbe altrimenti sempre
  // ricevuto null e l'invio sarebbe fallito silenziosamente (AC #1 mai
  // soddisfatto in pratica per un invio innescato da un Ruolo non-Admin).
  it("legge la configurazione SMTP col client service-role, non con la sessione del chiamante", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(configurazioneEsempio);
    sendMailMock.mockResolvedValue({ messageId: "abc" });

    await inviaEmail({ destinatario: "a@b.it", oggetto: "Test", testo: "Ciao" });

    expect(createAdminClientMock).toHaveBeenCalled();
    expect(leggiConfigurazioneSmtpMock).toHaveBeenCalledWith(adminClientFinto);
  });

  it("throws con messaggio riconoscibile quando la configurazione non esiste (AC #4)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(null);

    await expect(
      inviaEmail({
        destinatario: "a@b.it",
        oggetto: "Test",
        testo: "Ciao",
      })
    ).rejects.toThrow("CONFIGURAZIONE_SMTP_MANCANTE");
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("crea il transporter con i parametri corretti e invia (AC #3)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(configurazioneEsempio);
    sendMailMock.mockResolvedValue({ messageId: "abc" });

    await inviaEmail({
      destinatario: "a@b.it",
      oggetto: "Test",
      testo: "Ciao",
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtps.aruba.it",
      port: 465,
      secure: true,
      auth: { user: "info@esempio.it", pass: "segreta123" },
    });
    // Review fix: oggetto strutturato { name, address }, mai una stringa
    // costruita a mano - Nodemailer si occupa dell'escaping corretto
    // dell'header "From" (rischio di injection se nomeMittente contenesse
    // virgolette o ritorni a capo).
    expect(sendMailMock).toHaveBeenCalledWith({
      from: { name: "Polisportiva", address: "info@esempio.it" },
      to: "a@b.it",
      subject: "Test",
      text: "Ciao",
    });
  });

  it("usa solo l'indirizzo mittente se nomeMittente e' assente", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue({
      ...configurazioneEsempio,
      nomeMittente: null,
    });
    sendMailMock.mockResolvedValue({ messageId: "abc" });

    await inviaEmail({
      destinatario: "a@b.it",
      oggetto: "Test",
      testo: "Ciao",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "info@esempio.it" })
    );
  });

  it("propaga un errore di invio (es. credenziali rifiutate dal server SMTP)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(configurazioneEsempio);
    sendMailMock.mockRejectedValue(new Error("Invalid login"));

    await expect(
      inviaEmail({
        destinatario: "a@b.it",
        oggetto: "Test",
        testo: "Ciao",
      })
    ).rejects.toThrow("Invalid login");
  });

  // Story 4.3: estensione per allegati e destinatari multipli (Prerequisito
  // #1) - inviaEmailDiProva (Story 7.1, test sopra) continua a funzionare
  // invariata, nessun allegato/destinatario multiplo in quel caso.
  it("passa gli allegati a Nodemailer con filename/content/contentType (AC #1, Story 4.3)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(configurazioneEsempio);
    sendMailMock.mockResolvedValue({ messageId: "abc" });
    const contenutoFinto = Buffer.from("contenuto PDF finto");

    await inviaEmail({
      destinatario: "segreteria@esempio.it",
      oggetto: "Nuovo certificato",
      testo: "Certificato per Mario Rossi",
      allegati: [
        {
          nomeFile: "certificato.pdf",
          contenuto: contenutoFinto,
          tipoMime: "application/pdf",
        },
      ],
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: "certificato.pdf",
            content: contenutoFinto,
            contentType: "application/pdf",
          },
        ],
      })
    );
  });

  it("accetta un array di destinatari (AC #1, Story 4.3: piu' Utenti Segreteria)", async () => {
    leggiConfigurazioneSmtpMock.mockResolvedValue(configurazioneEsempio);
    sendMailMock.mockResolvedValue({ messageId: "abc" });

    await inviaEmail({
      destinatario: ["segreteria1@esempio.it", "segreteria2@esempio.it"],
      oggetto: "Test",
      testo: "Ciao",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["segreteria1@esempio.it", "segreteria2@esempio.it"],
      })
    );
  });
});

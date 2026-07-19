import "server-only";
import nodemailer from "nodemailer";
import { leggiConfigurazioneSmtp } from "@/lib/db-rls/configurazione-smtp";
import { createAdminClient } from "@/lib/auth-admin/client";

// Story 4.3: un allegato con i byte gia' letti (non un path/riferimento) -
// il chiamante scarica il contenuto dal proprio storage prima di invocare
// inviaEmail, questo modulo resta agnostico rispetto a dove i byte
// provengono.
export type AllegatoEmail = {
  nomeFile: string;
  contenuto: Buffer;
  tipoMime: string;
};

export type DatiEmail = {
  // Story 4.3: string[] per inviare a piu' destinatari (es. ogni Utente
  // Segreteria) in un solo invio - Nodemailer accetta entrambe le forme
  // nativamente per "to".
  destinatario: string | string[];
  oggetto: string;
  testo: string;
  allegati?: AllegatoEmail[];
};

// AD-12: nessuna variabile d'ambiente per le credenziali - lette a runtime
// da "configurazione_smtp" (RLS ADMIN-only, lib/db-rls/configurazione-smtp.ts)
// ad ogni invio, mai una connessione riusata/cache tra richieste (coerente
// col modello stateless serverless di questo progetto). Se non ancora
// configurata, l'errore inizia con "CONFIGURAZIONE_SMTP_MANCANTE" (token
// riconoscibile, AC #4) cosi' il chiamante puo' distinguere questo caso da
// un fallimento di invio vero e proprio (credenziali rifiutate, host
// irraggiungibile) e mostrare un messaggio diverso.
//
// Review fix (Story 4.3, scoperto in verifica dal vivo): la lettura usa il
// client service-role (createAdminClient, AD-11), MAI la sessione di chi
// ha innescato l'invio - "configurazione_smtp" ha RLS ADMIN-only (AD-12),
// ma l'invio email e' una capacita' di sistema richiamata anche da Ruoli
// non-Admin (Genitore/Atleta su upload certificato, Story 4.3; futuri
// promemoria, Story 4.6): con la sessione del chiamante, leggiConfigurazioneSmtp
// avrebbe sempre restituito null per RLS, facendo fallire OGNI invio non
// innescato da un Admin - AC #1 di questa storia non avrebbe mai funzionato
// in pratica. La configurazione non viene comunque mai restituita al
// chiamante, resta interna a questa funzione.
export async function inviaEmail(dati: DatiEmail): Promise<void> {
  const configurazione = await leggiConfigurazioneSmtp(createAdminClient());

  if (!configurazione) {
    throw new Error("CONFIGURAZIONE_SMTP_MANCANTE: nessuna configurazione email impostata.");
  }

  const transporter = nodemailer.createTransport({
    host: configurazione.host,
    port: configurazione.porta,
    secure: configurazione.sicura,
    auth: {
      user: configurazione.utente,
      pass: configurazione.password,
    },
  });

  // Review fix: oggetto strutturato { name, address } invece di una
  // stringa costruita a mano - Nodemailer si occupa dell'escaping corretto
  // dell'header "From" (senza questo, un nomeMittente con virgolette o
  // ritorni a capo avrebbe potuto produrre un header malformato/iniettato).
  const mittente = configurazione.nomeMittente
    ? { name: configurazione.nomeMittente, address: configurazione.mittente }
    : configurazione.mittente;

  await transporter.sendMail({
    from: mittente,
    to: dati.destinatario,
    subject: dati.oggetto,
    text: dati.testo,
    attachments: dati.allegati?.map((allegato) => ({
      filename: allegato.nomeFile,
      content: allegato.contenuto,
      contentType: allegato.tipoMime,
    })),
  });
}

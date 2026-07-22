import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/auth-admin/client";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaEmailPerRuolo } from "@/lib/utenti/email-per-ruolo";
import { elencaEmailCollegateAdAtleta } from "@/lib/utenti/email-destinatari-atleta";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { inviaEmail } from "@/lib/email/invia-email";
import { calcolaGiorniAScadenza } from "./calcola-giorni-a-scadenza";

// Review fix: confronto a tempo costante per l'unico segreto che protegge
// l'unico endpoint pubblicamente raggiungibile dell'app - un `!==` su
// stringa espone il tempo di risposta come canale laterale sulla
// lunghezza/prefisso corretto del segreto. Buffer di lunghezza diversa
// falliscono prima del confronto a tempo costante (la lunghezza non e' il
// segreto, solo il contenuto lo e').
function segretoValido(fornito: string | null, atteso: string): boolean {
  if (!fornito) return false;
  const bufferFornito = Buffer.from(fornito);
  const bufferAtteso = Buffer.from(atteso);
  if (bufferFornito.length !== bufferAtteso.length) return false;
  return timingSafeEqual(bufferFornito, bufferAtteso);
}

// Story 4.6 (FR-16, AD-7): unico Route Handler invocato da un Cron esterno
// schedulato (nessun vero Cloudflare Cron Trigger configurato in questa
// storia, vedi Dev Notes/Prerequisito #4 - ambiente di deploy Deferred
// nell'architettura). Nessuna sessione Supabase Auth protegge questo
// endpoint (e' pubblicamente raggiungibile) - l'unica autorizzazione e' il
// segreto CRON_SECRET, verificato fail-closed (AC #7): nessuna richiesta
// accettata se la variabile non e' configurata, stesso principio del Proxy
// (proxy.ts) su un errore imprevisto di autenticazione.
export async function GET(request: NextRequest) {
  const segretoAtteso = process.env.CRON_SECRET;
  const autorizzazione = request.headers.get("authorization");

  if (!segretoAtteso || !segretoValido(autorizzazione, `Bearer ${segretoAtteso}`)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Un solo "oggi" per l'intera esecuzione (mai piu' letture indipendenti di
  // new Date()) - sia per il calcolo dei giorni a scadenza sia per risolvere
  // l'Anno Agonistico corrente, stesso principio "oggi esplicito" gia'
  // stabilito da certificato-scaduto.ts (Story 4.5).
  const oggi = new Date();

  let certificati: Awaited<ReturnType<typeof elencaCertificati>>;
  let atlete: Awaited<ReturnType<typeof elencaAtlete>>;
  let annoAgonistico: Awaited<ReturnType<typeof trovaAnnoAgonisticoCorrente>>;
  let emailDirigenti: string[];

  try {
    // Nessuna sessione utente esiste in un Cron - createAdminClient()
    // (service-role) e' l'unico modo di leggere certificati_medici/atlete
    // (RLS-protette, AD-4/AD-9). trovaAnnoAgonisticoCorrente e' sola lettura
    // (mai risolviAnnoAgonisticoCorrente, che scrive) - un Cron di lettura
    // non deve mai creare un Anno Agonistico.
    const supabaseAdmin = createAdminClient();
    [certificati, atlete, annoAgonistico, emailDirigenti] = await Promise.all([
      elencaCertificati(supabaseAdmin),
      elencaAtlete(supabaseAdmin),
      trovaAnnoAgonisticoCorrente(oggi),
      elencaEmailPerRuolo("DIRIGENTE"),
    ]);
  } catch (err) {
    // Review fix: senza questo try/catch, un errore nella lettura iniziale
    // (es. query fallita) faceva fallire l'intera richiesta con una pagina
    // di errore HTML invece della risposta JSON che ogni altro AC
    // presuppone - a differenza del try/catch per singola Atleta sotto
    // (AC #8), qui l'intera esecuzione non puo' proseguire senza questi dati.
    console.error(err);
    return NextResponse.json({ error: "LETTURA_FALLITA" }, { status: 500 });
  }

  const emailDirigentiNormalizzate = emailDirigenti.map((e) => e.toLowerCase());

  let processati = 0;
  let inviati = 0;
  let falliti = 0;
  let saltati = 0;

  // AC #9: il ciclo tocca sempre il database (query sopra), anche se nessun
  // Certificato risulta in scadenza a 30/7 giorni in questa esecuzione -
  // mitigazione auto-pausa Supabase Free tier gia' prevista dall'architettura.
  for (const certificato of certificati) {
    const giorni = calcolaGiorniAScadenza(certificato.dataFineValidita, oggi);
    if (giorni !== 30 && giorni !== 7) continue;

    processati += 1;

    // AC #8: un fallimento per una singola Atleta (SMTP non configurato,
    // invio rifiutato, ecc.) non deve mai interrompere le altre - stesso
    // principio non bloccante di caricaCertificato (Story 4.3).
    try {
      const emailCollegate = await elencaEmailCollegateAdAtleta(
        certificato.atletaId,
        annoAgonistico?.id ?? null
      );
      // Review fix: dedup case-insensitive - due indirizzi che differiscono
      // solo per maiuscole/minuscole sono la stessa casella per qualunque
      // provider reale, un Set case-sensitive li tratterebbe come due
      // destinatari distinti (doppio invio alla stessa persona).
      const destinatari = Array.from(
        new Set([
          ...emailCollegate.map((e) => e.toLowerCase()),
          ...emailDirigentiNormalizzate,
        ])
      );

      // AC #6: nessun destinatario risolvibile non e' un errore, si salta.
      if (destinatari.length === 0) {
        saltati += 1;
        continue;
      }

      const atleta = atlete.find((a) => a.id === certificato.atletaId);
      const dataScadenza = String(certificato.dataFineValidita).slice(0, 10);

      await inviaEmail({
        destinatario: destinatari,
        oggetto: "Promemoria scadenza Certificato Medico",
        testo: `Il Certificato Medico di ${atleta?.nome ?? "un'Atleta"} scade tra ${giorni} giorni (il ${dataScadenza}). Rinnovalo per tempo.`,
      });
      inviati += 1;
    } catch (err) {
      console.error(err);
      falliti += 1;
    }
  }

  return NextResponse.json({ processati, inviati, falliti, saltati });
}

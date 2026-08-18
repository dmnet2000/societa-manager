import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Riga singola su id fisso (stesso principio di ID_CONFIGURAZIONE_SMTP,
// lib/db-rls/configurazione-smtp.ts) - un upsert atomico su questo id
// invece di un read-then-branch, evita la stessa race condition gia'
// documentata li'. NON protetta da RLS (vedi commento sul model in
// prisma/schema.prisma): letta anche da /accedi, prima dell'autenticazione.
export const ID_CONFIGURAZIONE_APPLICAZIONE =
  "00000000-0000-0000-0000-000000000001";

export const leggiNomeSettore = cache(async (): Promise<string | null> => {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { nomeSettore: true },
  });
  return configurazione?.nomeSettore ?? null;
});

// Story 18.21 (Review fix): unica sorgente del fallback, prima duplicato
// come stringa letterale in app/layout.tsx e app/manifest.ts - libero di
// disallinearsi a una futura modifica.
export const NOME_SETTORE_FALLBACK = "Settore Volley";

// Story 18.21: usata da app/manifest.ts per `short_name` - il nome del
// Settore e' testo libero configurato da Admin, senza vincolo di lunghezza,
// mentre `short_name` del Web App Manifest e' convenzionalmente breve
// (~12 caratteri, mostrato sotto l'icona nella home screen). Funzione pura
// (nessun accesso DB), stesso principio di `nessunContattoPubblicoConfigurato`
// sotto - troncamento semplice, nessuna libreria introdotta.
const LUNGHEZZA_MASSIMA_SHORT_NAME = 12;

// Review fix: troncamento tramite Array.from (code point, non unita' UTF-16)
// - un .slice(0,12) diretto puo' spezzare una coppia surrogata (es. un'emoji
// nel nome del Settore), producendo uno short_name malformato.
export function nomeSettoreAbbreviato(nomeSettore: string): string {
  const codePoints = Array.from(nomeSettore);
  return codePoints.length > LUNGHEZZA_MASSIMA_SHORT_NAME
    ? codePoints.slice(0, LUNGHEZZA_MASSIMA_SHORT_NAME).join("")
    : nomeSettore;
}

export async function salvaNomeSettore(nomeSettore: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, nomeSettore },
    update: { nomeSettore },
  });
}

// Story 9.31: mirror esatto di leggiNomeSettore/salvaNomeSettore sopra -
// destinatario unico dell'email di notifica upload Certificato Medico
// (Story 4.3), sostituisce la derivazione precedente da ogni Utente con
// Ruolo Segreteria.
export async function leggiEmailSegreteria(): Promise<string | null> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { emailSegreteria: true },
  });
  return configurazione?.emailSegreteria ?? null;
}

export async function salvaEmailSegreteria(email: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, emailSegreteria: email },
    update: { emailSegreteria: email },
  });
}

// Story 18.5: mirror esatto di leggiEmailSegreteria/salvaEmailSegreteria
// sopra - URL della Pagina Facebook pubblica, usato dal Page Plugin
// ufficiale in home pubblica (embed "ultimi post", nessun token/API).
export async function leggiUrlPaginaFacebook(): Promise<string | null> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { urlPaginaFacebook: true },
  });
  return configurazione?.urlPaginaFacebook ?? null;
}

export async function salvaUrlPaginaFacebook(url: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, urlPaginaFacebook: url },
    update: { urlPaginaFacebook: url },
  });
}

// Story 18.11: a differenza delle coppie leggiX/salvaX sopra (1 funzione per
// campo, arrivate in storie separate), qui i 3 campi arrivano insieme in
// un'unica storia - una sola lettura/un solo upsert atomico sui 3 campi
// insieme (invece di 3 round-trip DB sequenziali), stesso principio
// "atomico sull'id fisso, no read-then-branch" esteso a un oggetto con piu'
// chiavi.
export async function leggiContattiPubblici(): Promise<{
  indirizzoSede: string | null;
  telefonoPubblico: string | null;
  emailPubblica: string | null;
}> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { indirizzoSede: true, telefonoPubblico: true, emailPubblica: true },
  });
  return {
    indirizzoSede: configurazione?.indirizzoSede ?? null,
    telefonoPubblico: configurazione?.telefonoPubblico ?? null,
    emailPubblica: configurazione?.emailPubblica ?? null,
  };
}

export async function salvaContattiPubblici(valori: {
  indirizzoSede: string | null;
  telefonoPubblico: string | null;
  emailPubblica: string | null;
}): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, ...valori },
    update: valori,
  });
}

// Funzione pura (nessun accesso DB) - usata da app/contatti/page.tsx per il
// ramo "stato vuoto" (AC #3) e testata direttamente qui, invece di un test
// di rendering JSX su un componente di pagina pubblica (convenzione assente
// in questo progetto). "Nessun campo" include il social (urlPaginaFacebook),
// non solo i 3 campi introdotti da questa storia - EXPERIENCE.md elenca i
// 4 come ugualmente opzionali sotto la stessa regola.
export function nessunContattoPubblicoConfigurato(contatti: {
  indirizzoSede: string | null;
  telefonoPubblico: string | null;
  emailPubblica: string | null;
  urlPaginaFacebook: string | null;
}): boolean {
  return (
    !contatti.indirizzoSede &&
    !contatti.telefonoPubblico &&
    !contatti.emailPubblica &&
    !contatti.urlPaginaFacebook
  );
}

// Story 18.20: mirror esatto di leggiUrlPaginaFacebook/salvaUrlPaginaFacebook
// sopra - URL del sito della Polisportiva, mostrato sotto al suo logo
// (bucket Storage "logo-polisportiva") sia nell'header sia nel footer
// pubblici.
export async function leggiUrlSitoPolisportiva(): Promise<string | null> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { urlSitoPolisportiva: true },
  });
  return configurazione?.urlSitoPolisportiva ?? null;
}

export async function salvaUrlSitoPolisportiva(url: string | null): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, urlSitoPolisportiva: url },
    update: { urlSitoPolisportiva: url },
  });
}

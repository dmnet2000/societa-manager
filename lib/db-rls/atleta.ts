import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// AD-10 (esteso, Story 9.18): campi identitari di Atleta - creazione/
// aggiornamento passano sempre da qui, mai duplicati altrove. Due soli
// moduli autorizzati a chiamare creaAtleta/aggiornaAtleta: Onboarding-Import
// (proprietario originale) e, dalla Story 9.18, Gruppi-Allenatori
// (creaEAssegnaAtleta, /i-miei-gruppi) - vedi ARCHITECTURE-SPINE.md.
export type DatiAtletaIdentitari = {
  codiceFiscale: string;
  nome: string;
  sesso: "M" | "F";
  dataNascita: Date;
  luogoNascita?: string | null;
  provinciaNascita?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  localitaResidenza?: string | null;
  provinciaResidenza?: string | null;
  categoria?: string | null;
  matricola?: string | null;
  dataPrimoTesseramento?: Date | null;
  // Story 9.18: contatti opzionali, valorizzati quando un Allenatore crea
  // una nuova Atleta dalla pagina del proprio Gruppo - assenti per
  // l'import federale (Onboarding-Import), che non li fornisce.
  email?: string | null;
  cellulare?: string | null;
};

function serializza(dati: DatiAtletaIdentitari) {
  return {
    ...dati,
    dataNascita: dati.dataNascita.toISOString(),
    dataPrimoTesseramento: dati.dataPrimoTesseramento?.toISOString() ?? null,
  };
}

// AD-4/AD-9: Atleta e' protetta da RLS - il client Supabase passato deve
// avere la sessione dell'utente autenticato (mai Prisma diretto a runtime).
// `id`/`updatedAt` vanno generati qui esplicitamente: i default Prisma
// (@default(uuid()), @updatedAt) sono lato Prisma Client, non colonne con
// default a livello Postgres - non si applicano quando si scrive tramite
// supabase-js (scoperto verificando dal vivo la policy RLS di questa storia).
// Restituisce l'id generato (Story 1.7: serve al chiamante per collegare il
// CertificatoMedico alla nuova Atleta appena creata).
export async function creaAtleta(
  supabase: SupabaseClient,
  dati: DatiAtletaIdentitari
): Promise<string> {
  const id = randomUUID();
  const { error } = await supabase.from("atlete").insert({
    id,
    ...serializza(dati),
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return id;
}

export type AtletaElenco = {
  id: string;
  nome: string;
  codiceFiscale: string;
  categoria: string | null;
};

// Story 1.6: sola lettura, riusata dalla pagina di conferma iscrizioni per
// mostrare l'elenco completo delle Atlete (AD-2: lettura condivisa, non una
// scrittura sui campi identitari - non tocca AD-10). `categoria` inclusa da
// Story 1.8 per riconoscere le Under 13 candidate al riporto stagionale.
export async function elencaAtlete(
  supabase: SupabaseClient
): Promise<AtletaElenco[]> {
  const { data, error } = await supabase
    .from("atlete")
    .select("id, nome, codiceFiscale, categoria")
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function aggiornaAtleta(
  supabase: SupabaseClient,
  id: string,
  dati: DatiAtletaIdentitari
): Promise<void> {
  // .select() dopo l'update e' necessario per rilevare un aggiornamento che
  // non ha toccato nessuna riga (id inesistente, o negato dalla RLS) -
  // PostgREST non restituisce un errore in quel caso, solo un risultato
  // vuoto (review Story 1.3: senza questo controllo, l'azione riportava
  // "aggiornata" anche quando non era successo nulla).
  const { data, error } = await supabase
    .from("atlete")
    .update({
      ...serializza(dati),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Nessuna riga aggiornata per l'Atleta ${id} (non trovata o non autorizzata).`
    );
  }
}

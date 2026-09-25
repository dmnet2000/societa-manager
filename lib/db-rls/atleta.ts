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

// Story 9.43 (review fix): unica fonte di verita' dei due motivi validi -
// prima duplicata come union inline sia in AtletaElenco/DatiRimozioneAtleta
// qui sia come array di value/label in RimuoviAtletaForm.tsx e come
// MOTIVI_RIMOZIONE_VALIDI in conferma-iscrizioni/actions.ts, con tre punti
// da tenere manualmente allineati a mano per un futuro terzo motivo.
export type MotivoRimozioneAtleta = "NON_PIU_IN_SOCIETA" | "TRASFERITA";

export const MOTIVI_RIMOZIONE_ATLETA: readonly MotivoRimozioneAtleta[] = [
  "NON_PIU_IN_SOCIETA",
  "TRASFERITA",
];

export type AtletaElenco = {
  id: string;
  nome: string;
  codiceFiscale: string;
  categoria: string | null;
  // Story 9.43: sempre selezionati (anche quando includiRimosse e' false,
  // nel qual caso valgono sempre null per una riga restituita) - un'unica
  // query resta la sola fonte di verita' del filtro (Design Notes
  // spec-9-43): una select() variabile per opzione avrebbe richiesto due
  // shape diversi di AtletaElenco a seconda del parametro, piu' fragile.
  rimossaIl: string | null;
  // Story 9.43 (review fix): tipizzato con l'union sopra, non piu' un
  // generico string - un valore imprevisto in colonna resterebbe comunque
  // leggibile a runtime (fallback di etichettaMotivo in IscrizioniElenco.tsx),
  // ma qui il compilatore segnala subito un consumo non aggiornato.
  motivoRimozione: MotivoRimozioneAtleta | null;
  notaRimozione: string | null;
};

export type OpzioniElencoAtlete = {
  // Story 9.43: default false -> esclude le Atlete rimosse
  // (.is("rimossaIl", null)). true -> nessun filtro, tutte incluse - usata
  // esplicitamente dai soli 3 consumatori che devono vederle
  // (conferma-iscrizioni, certificato-medico, dati-fisici). Tutti gli altri
  // ~18 chiamanti esistenti ereditano l'esclusione senza alcuna modifica.
  includiRimosse?: boolean;
};

// Story 1.6: sola lettura, riusata dalla pagina di conferma iscrizioni per
// mostrare l'elenco completo delle Atlete (AD-2: lettura condivisa, non una
// scrittura sui campi identitari - non tocca AD-10). `categoria` inclusa da
// Story 1.8 per riconoscere le Under 13 candidate al riporto stagionale.
export async function elencaAtlete(
  supabase: SupabaseClient,
  opzioni?: OpzioniElencoAtlete
): Promise<AtletaElenco[]> {
  let query = supabase
    .from("atlete")
    .select(
      "id, nome, codiceFiscale, categoria, rimossaIl, motivoRimozione, notaRimozione"
    );

  if (!opzioni?.includiRimosse) {
    query = query.is("rimossaIl", null);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export type AtletaPubblica = {
  id: string;
  nome: string;
};

// Story 18.24: lettura dedicata e ristretta per la pagina pubblica /squadre
// (nessuna sessione) - espone SOLO id+nome, mai codiceFiscale/categoria come
// elencaAtlete sopra (dati non ammessi su una pagina pubblica). La RLS di
// "atlete" non concede alcun accesso a un Visitatore anonimo (nessuna
// policy pubblica esiste su questa tabella) - il client passato DEVE essere
// createAdminClient() (service-role, bypassa RLS), mai createClient()
// (sessione anonima), che qui fallirebbe silenziosamente (righe vuote, non
// un errore) esattamente come su qualunque altra lettura RLS senza sessione.
export async function elencaAtletePubbliche(
  supabaseAdmin: SupabaseClient,
  opzioni?: OpzioniElencoAtlete
): Promise<AtletaPubblica[]> {
  let query = supabaseAdmin.from("atlete").select("id, nome");

  // Story 9.43: default false -> esclude le rimosse, stesso principio di
  // elencaAtlete sopra - /squadre (pubblica) eredita l'esclusione senza
  // alcuna modifica al file chiamante (nessun parametro passato).
  if (!opzioni?.includiRimosse) {
    query = query.is("rimossaIl", null);
  }

  const { data, error } = await query.order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export type AtletaMinima = {
  id: string;
  nome: string;
};

// Story 1.10: risolve {id, nome} per un elenco di id di Atleta - mirror
// esatto di elencaAtletePubbliche sopra (stesso shape ristretto, id+nome
// soltanto), usata da admin/page.tsx per mostrare le Atlete gia' collegate a
// un Genitore SENZA un include Prisma diretto su Atleta (AD-4/AD-9: Atleta e'
// protetta da RLS). Nessuna sessione utente disponibile in questo contesto
// Admin (stesso motivo di elencaAtletePubbliche) - il client passato DEVE
// essere createAdminClient() (service-role), mai createClient().
// ids vuoto -> [] senza interrogare il DB (evita un .in("id", []) che
// PostgREST potrebbe non gestire come atteso).
export async function elencaAtletePerIds(
  supabase: SupabaseClient,
  ids: string[],
  opzioni?: OpzioniElencoAtlete
): Promise<AtletaMinima[]> {
  if (ids.length === 0) {
    return [];
  }

  let query = supabase.from("atlete").select("id, nome").in("id", ids);

  // Story 9.43: stesso default di elencaAtlete/elencaAtletePubbliche sopra.
  if (!opzioni?.includiRimosse) {
    query = query.is("rimossaIl", null);
  }

  const { data, error } = await query.order("nome", { ascending: true });

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

export type DatiRimozioneAtleta = {
  motivoRimozione: MotivoRimozioneAtleta;
  notaRimozione: string | null;
};

// Story 9.43: archiviazione reversibile - MAI un DELETE (onDelete Cascade su
// Iscrizione/Tesseramento/CertificatoMedico/GruppoAtleta/Presenza/Notifica/
// MisurazioneAtleta/GenitoreAtleta porterebbe via lo storico). Nome
// deliberatamente diverso dalla Server Action omonima rimuoviAtleta
// (conferma-iscrizioni/actions.ts, che chiama questa funzione) - stesso
// principio gia' in uso per escludiIscrizione/disattivaIscrizione. Non
// riusa aggiornaAtleta/DatiAtletaIdentitari sopra: quei campi sono di
// proprieta' esclusiva di Onboarding-Import/Gruppi-Allenatori (AD-10),
// mentre questi tre campi sono di competenza di conferma-iscrizioni.
export async function segnaAtletaRimossa(
  supabase: SupabaseClient,
  id: string,
  dati: DatiRimozioneAtleta
): Promise<void> {
  const { data, error } = await supabase
    .from("atlete")
    .update({
      rimossaIl: new Date().toISOString(),
      motivoRimozione: dati.motivoRimozione,
      notaRimozione: dati.notaRimozione,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    // Story 9.43 (review fix): idempotenza - senza questo filtro, una
    // rimozione ripetuta (tab rimasta aperta, due Admin in contemporanea)
    // sovrascriveva silenziosamente motivo/nota/data della rimozione
    // originale con quelli del secondo tentativo. Con il filtro, il secondo
    // tentativo aggiorna zero righe: nessun dato perso, vedi sotto.
    .is("rimossaIl", null)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Nessuna riga aggiornata per l'Atleta ${id} (non trovata, non autorizzata, o già rimossa).`
    );
  }
}

// Story 9.43 (AC #7): azzera i 3 campi - nessun ripristino automatico
// dell'Iscrizione (l'Atleta torna "non iscritta", da riconfermare), stesso
// principio "riga effettivamente modificata" di segnaAtletaRimossa sopra.
export async function annullaRimozioneAtleta(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { data, error } = await supabase
    .from("atlete")
    .update({
      rimossaIl: null,
      motivoRimozione: null,
      notaRimozione: null,
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

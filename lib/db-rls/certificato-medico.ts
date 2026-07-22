import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DatiCertificato = {
  dataInizioValidita: Date | null;
  dataFineValidita: Date;
  mesiValidita: number | null;
  modulo: string | null;
};

function serializza(dati: DatiCertificato) {
  return {
    dataInizioValidita: dati.dataInizioValidita?.toISOString() ?? null,
    dataFineValidita: dati.dataFineValidita.toISOString(),
    mesiValidita: dati.mesiValidita,
    modulo: dati.modulo,
  };
}

// AD-4/AD-9: CertificatoMedico e' protetta da RLS - il client Supabase
// passato deve avere la sessione dell'utente autenticato (mai Prisma
// diretto a runtime), stesso pattern di lib/db-rls/atleta.ts (Story 1.3).
export async function trovaCertificatoPerAtleta(
  supabase: SupabaseClient,
  atletaId: string
) {
  const { data, error } = await supabase
    .from("certificati_medici")
    .select("*")
    .eq("atletaId", atletaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Story 4.4: un'unica lettura di tutti i Certificati visibili al Ruolo
// (RLS-filtrati) - evita un ciclo di N chiamate a trovaCertificatoPerAtleta
// (N+1) nella pagina di elenco della Segreteria (fino a ~200 Atlete, NFR5);
// il join con le Atlete resta applicativo, in memoria, stesso pattern gia'
// usato in notifiche/page.tsx e storico-presenze/page.tsx.
// Review fix: colonne esplicite invece di `select("*")` (stesso principio
// gia' corretto per elencaNotifiche in Story 4.2 - un futuro campo aggiunto
// alla tabella non deve raggiungere il chiamante senza una decisione
// consapevole in review).
export async function elencaCertificati(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("certificati_medici")
    .select(
      "id, atletaId, stato, filePath, dataInizioValidita, dataFineValidita, mesiValidita, modulo"
    );

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

// `id`/`updatedAt` generati esplicitamente: i default Prisma
// (@default(uuid()), @updatedAt) sono lato Prisma Client, non colonne con
// default a livello Postgres - non si applicano quando si scrive tramite
// supabase-js (stessa lezione di Story 1.3).
export async function creaCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  dati: DatiCertificato
): Promise<void> {
  const { error } = await supabase.from("certificati_medici").insert({
    id: randomUUID(),
    atletaId,
    ...serializza(dati),
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function aggiornaCertificato(
  supabase: SupabaseClient,
  id: string,
  dati: DatiCertificato
): Promise<void> {
  // .select() dopo l'update per rilevare un aggiornamento che non ha
  // toccato nessuna riga (id inesistente o negato dalla RLS) - stesso
  // controllo introdotto in aggiornaAtleta (Story 1.3 review).
  const { data, error } = await supabase
    .from("certificati_medici")
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
      `Nessuna riga aggiornata per il Certificato ${id} (non trovato o non autorizzato).`
    );
  }
}

// Story 4.1: collega il file appena caricato (lib/storage/certificati.ts)
// alla riga CertificatoMedico dell'Atleta, senza toccare i campi di
// validita'. Upsert su atletaId (chiave unica esistente): il payload
// include DELIBERATAMENTE solo id/atletaId/filePath/updatedAt - mai
// dataFineValidita/dataInizioValidita/mesiValidita/modulo, cosi' su un
// conflitto (AC #4, ri-caricamento) i valori di validita' esistenti restano
// intatti (semantica standard di upsert PostgREST: solo le colonne presenti
// nel payload vengono aggiornate); se la riga non esiste ancora, viene
// creata con dataFineValidita implicitamente NULL (colonna nullable dalla
// migrazione di questa storia) - "in attesa di validazione" (Story 4.4).
// Stesso "churn" accettato dell'id sull'upsert gia' documentato per
// Presenza (Story 3.1): nessuna FK punta a CertificatoMedico.id.
export async function collegaFileCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  filePath: string
): Promise<void> {
  const { error } = await supabase.from("certificati_medici").upsert(
    {
      id: randomUUID(),
      atletaId,
      filePath,
      // Story 4.4: ogni upload (primo o ri-caricamento) forza IN_ATTESA -
      // un Certificato appena caricato non e' mai gia' verificato da un
      // umano; un ri-caricamento di uno gia' CONFERMATO richiede una nuova
      // conferma (AC #3), le vecchie date restano a sistema ma non sono
      // piu' garantite valide per il nuovo documento.
      stato: "IN_ATTESA",
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "atletaId" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export type DatiConferma = DatiCertificato & { filePath?: string | null };

// Story 4.4 (FR-14): un solo upsert copre sia la conferma di un Certificato
// gia' caricato (AC #1, filePath omesso: non sostituisce il file esistente)
// sia l'inserimento manuale ex-novo (AC #2, filePath opzionale se la
// Segreteria allega una scansione del documento cartaceo) - stessa chiave
// unica (atletaId) gia' usata da collegaFileCertificato. Sempre stato
// CONFERMATO: chi chiama questa funzione (Segreteria/Admin/Dirigente,
// requireRuolo a monte) ha gia' verificato i dati.
export async function confermaCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  dati: DatiConferma
): Promise<void> {
  const { error } = await supabase.from("certificati_medici").upsert(
    {
      id: randomUUID(),
      atletaId,
      ...serializza(dati),
      ...(dati.filePath !== undefined ? { filePath: dati.filePath } : {}),
      stato: "CONFERMATO",
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "atletaId" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

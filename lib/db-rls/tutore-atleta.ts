import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Story 27.1: Genitori/Tutori dell'Atleta minorenne (tabella RLS
// "tutori_atleta") - unico punto di lettura/scrittura a runtime, mai una
// query Prisma diretta. Il client passato deve avere la sessione
// dell'utente autenticato: la RLS ammette ADMIN/SEGRETERIA in scrittura,
// DIRIGENTE in sola lettura.

export type PosizioneTutore = 1 | 2;

export const POSIZIONI_TUTORE: readonly PosizioneTutore[] = [1, 2];

export type TutoreAtleta = {
  id: string;
  atletaId: string;
  posizione: PosizioneTutore;
  nome: string;
  codiceFiscale: string;
  luogoNascita: string | null;
  // ISO completo come restituito da PostgREST (timestamp), troncabile a
  // yyyy-mm-dd dal chiamante per un <input type="date">.
  dataNascita: string | null;
  indirizzo: string | null;
  cap: string | null;
  localitaResidenza: string | null;
  provinciaResidenza: string | null;
  email: string | null;
  telefono: string | null;
  intestatarioRicevuta: boolean;
  utenteId: string | null;
};

export type DatiTutore = {
  nome: string;
  codiceFiscale: string;
  luogoNascita: string | null;
  dataNascita: Date | null;
  indirizzo: string | null;
  cap: string | null;
  localitaResidenza: string | null;
  provinciaResidenza: string | null;
  email: string | null;
  telefono: string | null;
  intestatarioRicevuta: boolean;
  utenteId: string | null;
};

// dati null = slot vuoto: l'eventuale riga esistente in quella posizione
// viene eliminata.
export type SlotTutore = {
  posizione: PosizioneTutore;
  dati: DatiTutore | null;
};

const COLONNE =
  "id, atletaId, posizione, nome, codiceFiscale, luogoNascita, dataNascita, indirizzo, cap, localitaResidenza, provinciaResidenza, email, telefono, intestatarioRicevuta, utenteId";

// Tutte le righe visibili al chiamante (RLS), ordinate per Atleta e
// posizione - la pagina /app/gruppi le raggruppa in memoria per atletaId,
// stesso pattern di join applicativo di elencaCertificati.
export async function elencaTutori(supabase: SupabaseClient): Promise<TutoreAtleta[]> {
  const { data, error } = await supabase
    .from("tutori_atleta")
    .select(COLONNE)
    .order("atletaId", { ascending: true })
    .order("posizione", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TutoreAtleta[];
}

function serializza(dati: DatiTutore) {
  return {
    ...dati,
    dataNascita: dati.dataNascita?.toISOString() ?? null,
  };
}

// Aggiornamento per posizione invece di "cancella tutto e reinserisci"
// (Design Notes spec-27-1): conserva id/createdAt della riga quando si
// corregge un solo campo. Non un vero upsert PostgREST su
// (atletaId, posizione): quello riscriverebbe anche l'id con il nuovo UUID
// generato qui. Ordine delle operazioni pensato per l'indice unico parziale
// "un solo intestatarioRicevuta per Atleta": prima le eliminazioni e
// l'azzeramento del flag, poi le scritture - uno scambio di intestatario tra
// posizione 1 e 2 non passa mai da uno stato con due intestatari.
// Nessuna transazione (PostgREST): un errore a meta' lascia le operazioni
// gia' eseguite - il chiamante riceve l'eccezione e l'utente puo' riprovare,
// l'operazione e' idempotente.
export async function salvaTutoriAtleta(
  supabase: SupabaseClient,
  atletaId: string,
  slot: SlotTutore[]
): Promise<void> {
  const { data: esistenti, error: erroreLettura } = await supabase
    .from("tutori_atleta")
    .select("posizione")
    .eq("atletaId", atletaId);
  if (erroreLettura) {
    throw new Error(erroreLettura.message);
  }
  const posizioniEsistenti = new Set(
    (esistenti ?? []).map((r: { posizione: number }) => r.posizione)
  );

  const daEliminare = slot
    .filter((s) => s.dati === null && posizioniEsistenti.has(s.posizione))
    .map((s) => s.posizione);
  if (daEliminare.length > 0) {
    const { error } = await supabase
      .from("tutori_atleta")
      .delete()
      .eq("atletaId", atletaId)
      .in("posizione", daEliminare);
    if (error) {
      throw new Error(error.message);
    }
  }

  const adesso = new Date().toISOString();

  const { error: erroreReset } = await supabase
    .from("tutori_atleta")
    .update({ intestatarioRicevuta: false, updatedAt: adesso })
    .eq("atletaId", atletaId)
    .eq("intestatarioRicevuta", true);
  if (erroreReset) {
    throw new Error(erroreReset.message);
  }

  for (const { posizione, dati } of slot) {
    if (dati === null) continue;

    if (posizioniEsistenti.has(posizione)) {
      const { data, error } = await supabase
        .from("tutori_atleta")
        .update({ ...serializza(dati), updatedAt: adesso })
        .eq("atletaId", atletaId)
        .eq("posizione", posizione)
        .select("id");
      if (error) {
        throw new Error(error.message);
      }
      if (!data || data.length === 0) {
        throw new Error(
          `Nessuna riga aggiornata per il Genitore/Tutore ${posizione} dell'Atleta ${atletaId} (non trovata o non autorizzata).`
        );
      }
    } else {
      const { error } = await supabase.from("tutori_atleta").insert({
        id: randomUUID(),
        atletaId,
        posizione,
        ...serializza(dati),
        updatedAt: adesso,
      });
      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RigaPresenza = {
  atletaId: string;
  slotId: string;
  data: string;
  presente: boolean;
};

export type PresenzaRegistrata = { atletaId: string; presente: boolean };

export type PresenzaStorico = {
  id: string;
  slotId: string;
  data: string;
  presente: boolean;
};

// AD-4/AD-9: Presenza e' protetta da RLS - il client Supabase passato deve
// avere la sessione dell'utente autenticato (mai Prisma diretto a runtime),
// stesso pattern di lib/db-rls/iscrizione.ts.
//
// Primo utilizzo di .upsert() via supabase-js in questa codebase (Dev Notes
// Story 3.1): PostgREST genera un ON CONFLICT DO UPDATE SET su tutte le
// colonne del payload, incluso "id" - un id generato lato client viene quindi
// riscritto ad ogni ri-registrazione della stessa combinazione
// atletaId+slotId+data (AC #3). Accettato deliberatamente: nessuna FK punta
// a Presenza.id, questo "churn" della chiave primaria e' innocuo - non
// introdurre un DEFAULT Postgres one-off solo per questa tabella.
//
// Un tentativo di registrare per uno Slot di un Gruppo altrui (AC #4) viene
// rifiutato dalla policy RLS "allenatore_proprio_gruppo_insert"/"_update" -
// l'upsert fallisce con un errore Postgres esplicito, propagato qui, non un
// successo silenzioso parziale.
export async function registraPresenze(
  supabase: SupabaseClient,
  righe: RigaPresenza[]
): Promise<void> {
  const { error } = await supabase.from("presenze").upsert(
    righe.map((riga) => ({ id: randomUUID(), ...riga })),
    { onConflict: "atletaId,slotId,data" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

// Precompila i checkbox del form con le presenze gia' registrate per questo
// Slot+data (AC #3: correggere presenze esistenti, non solo crearne di nuove).
export async function leggiPresenzePerSlotEData(
  supabase: SupabaseClient,
  slotId: string,
  data: string
): Promise<PresenzaRegistrata[]> {
  const { data: righe, error } = await supabase
    .from("presenze")
    .select("atletaId, presente")
    .eq("slotId", slotId)
    .eq("data", data);

  if (error) {
    throw new Error(error.message);
  }

  return righe ?? [];
}

// Story 3.2 AC #1: elenco cronologico (ordine ascendente, dal piu' vecchio al
// piu' recente) delle Presenze di una singola Atleta - RLS restringe
// autonomamente le righe visibili a seconda del Ruolo del chiamante
// (Allenatore: solo le proprie Atlete/Gruppi via allenatore_proprio_gruppo_select,
// Story 3.1; Atleta: solo se stessa via atleta_propria_select, Story 3.2) -
// nessun filtro aggiuntivo va applicato qui. Secondo `.order("id")` come
// spareggio deterministico (review fix): `data` non e' univoca da sola (due
// Slot diversi possono cadere nello stesso giorno), senza un secondo campo
// di ordinamento le righe con la stessa data avrebbero un ordine arbitrario
// tra una richiesta e l'altra.
export async function leggiStoricoPresenzePerAtleta(
  supabase: SupabaseClient,
  atletaId: string
): Promise<PresenzaStorico[]> {
  const { data: righe, error } = await supabase
    .from("presenze")
    .select("id, slotId, data, presente")
    .eq("atletaId", atletaId)
    .order("data", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return righe ?? [];
}

export type PresenzaGriglia = { atletaId: string; data: string; presente: boolean };

// Story 9.17 (AC #1, #2, #3): presenze di piu' Atlete su un intervallo di
// date (un mese), filtrate anche per gli Slot di UN Gruppo specifico - a
// differenza di leggiStoricoPresenzePerAtleta (storico completo di una sola
// Atleta, Gruppo per Gruppo), qui il filtro su slotIds evita che le Presenze
// di un Gruppo precedente (Atleta riassegnata, Story 9.15) compaiano nella
// griglia del nuovo Gruppo. `giorni` e' l'array gia' ordinato prodotto da
// giorniDelMese() - si usa solo il primo/ultimo elemento come range.
export async function leggiPresenzeGriglia(
  supabase: SupabaseClient,
  slotIds: string[],
  atletaIds: string[],
  giorni: string[]
): Promise<PresenzaGriglia[]> {
  // Guardia esplicita: .in(col, []) ha semantica non affidabile in
  // PostgREST - un Gruppo senza Slot o senza Atlete non ha comunque nulla
  // da mostrare, nessuna query necessaria. Review fix: anche giorni vuoto
  // va guardato - senza, giorni[0]/giorni[giorni.length-1] sarebbero
  // entrambi undefined, passati a .gte("data", undefined).lte(...).
  if (slotIds.length === 0 || atletaIds.length === 0 || giorni.length === 0) {
    return [];
  }

  const { data: righe, error } = await supabase
    .from("presenze")
    .select("atletaId, data, presente")
    .in("slotId", slotIds)
    .in("atletaId", atletaIds)
    .gte("data", giorni[0])
    .lte("data", giorni[giorni.length - 1]);

  if (error) {
    throw new Error(error.message);
  }

  return righe ?? [];
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Referto elettronico, story 3.2 (AD-6, AD-11, AD-17): rosa di una
// SquadraTorneo. Tabelle protette da RLS - il client Supabase passato deve
// avere la sessione dell'utente autenticato. Log: mai nomi della rosa.

export type RuoloTesserato = "A" | "VA" | "M" | "FT" | "D";

export type GiocatoreRosa = {
  id: string;
  numero: number;
  nome: string;
  cognome: string;
  capitano: boolean;
  libero: boolean;
};

export type TesseratoRosa = { id: string; ruolo: RuoloTesserato; nome: string };

export type Rosa = {
  versione: number;
  giocatori: GiocatoreRosa[];
  tesserati: TesseratoRosa[];
};

export type GiocatoreInput = {
  numero: number;
  nome: string;
  cognome: string;
  capitano?: boolean;
  libero?: boolean;
};

export type TesseratoInput = { ruolo: RuoloTesserato; nome: string };

export type EsitoSalvataggioRosa = { esito: "ok" | "conflitto"; versione: number };

export class RosaForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor() {
    super("FORBIDDEN");
    this.name = "RosaForbiddenError";
  }
}

export class RosaValidationError extends Error {
  readonly code = "VALIDATION";
  constructor(message: string) {
    super(message);
    this.name = "RosaValidationError";
  }
}

// Restituisce null se la rosa non esiste o non e' visibile al chiamante (RLS).
export async function leggiRosa(
  supabase: SupabaseClient,
  squadraTorneoId: string
): Promise<Rosa | null> {
  // Una sola query con relazioni incorporate: versione e figli sono coerenti.
  const { data: rosa, error } = await supabase
    .from("rose_squadra")
    .select(
      "versione, giocatori_rosa(id, numero, nome, cognome, capitano, libero), tesserati_rosa(id, ruolo, nome)"
    )
    .eq("squadraTorneoId", squadraTorneoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!rosa) {
    return null;
  }

  const giocatori = [...((rosa.giocatori_rosa ?? []) as GiocatoreRosa[])].sort(
    (a, b) => a.numero - b.numero
  );
  const tesserati = [...((rosa.tesserati_rosa ?? []) as TesseratoRosa[])].sort(
    (a, b) =>
      ORDINE_RUOLI.indexOf(a.ruolo) - ORDINE_RUOLI.indexOf(b.ruolo) ||
      a.nome.localeCompare(b.nome)
  );

  return { versione: rosa.versione as number, giocatori, tesserati };
}

const ORDINE_RUOLI: RuoloTesserato[] = ["A", "VA", "M", "FT", "D"];

export async function salvaRosa(
  supabase: SupabaseClient,
  squadraTorneoId: string,
  versioneBase: number,
  idModifica: string,
  giocatori: GiocatoreInput[],
  tesserati: TesseratoInput[]
): Promise<EsitoSalvataggioRosa> {
  const { data, error } = await supabase.rpc("salva_rosa_squadra", {
    squadra_id_param: squadraTorneoId,
    versione_base: versioneBase,
    id_modifica: idModifica,
    giocatori,
    tesserati,
  });

  if (error) {
    const messaggio = error.message ?? "";
    if (messaggio.startsWith("FORBIDDEN")) {
      throw new RosaForbiddenError();
    }
    if (messaggio.startsWith("VALIDATION")) {
      throw new RosaValidationError(messaggio);
    }
    // Permesso negato di PostgREST (42501, es. anon): stessa semantica.
    if (error.code === "42501") {
      throw new RosaForbiddenError();
    }
    throw new Error(messaggio);
  }

  const esito = data as { esito?: string; versione?: number } | null;
  if (
    !esito ||
    (esito.esito !== "ok" && esito.esito !== "conflitto") ||
    typeof esito.versione !== "number"
  ) {
    throw new Error("Risposta inattesa da salva_rosa_squadra");
  }
  return { esito: esito.esito, versione: esito.versione };
}

// Story 3.13 (AD-4): cancellazione delle rose di un'Edizione, solo ADMIN
// (la funzione SQL e' SECURITY DEFINER). Restituisce quante rose ha cancellato.
export async function cancellaRoseEdizione(
  supabase: SupabaseClient,
  edizioneTorneoId: string
): Promise<number> {
  const { data, error } = await supabase.rpc("cancella_rose_edizione", {
    edizione_id_param: edizioneTorneoId,
  });

  if (error) {
    const messaggio = error.message ?? "";
    if (messaggio.startsWith("FORBIDDEN") || error.code === "42501") {
      throw new RosaForbiddenError();
    }
    throw new Error(messaggio);
  }
  if (typeof data !== "number") {
    throw new Error("Risposta inattesa da cancella_rose_edizione");
  }
  return data;
}

// Numero di rose salvate per le Squadre indicate (quelle dell'Edizione), letto
// con la sessione (RLS). Gli id arrivano da Prisma: squadre_torneo e
// categorie_torneo non sono leggibili da authenticated (REVOKE ALL), quindi
// un filtro incorporato PostgREST fallirebbe sempre. A blocchi per non
// allungare troppo l'URL.
const BLOCCO_CONTEGGIO = 100;

export async function contaRoseEdizione(
  supabase: SupabaseClient,
  squadraTorneoIds: readonly string[]
): Promise<number> {
  let totale = 0;
  for (let i = 0; i < squadraTorneoIds.length; i += BLOCCO_CONTEGGIO) {
    const blocco = squadraTorneoIds.slice(i, i + BLOCCO_CONTEGGIO);
    const { count, error } = await supabase
      .from("rose_squadra")
      .select("id", { count: "exact", head: true })
      .in("squadraTorneoId", blocco);
    if (error) {
      throw new Error(error.message);
    }
    totale += count ?? 0;
  }
  return totale;
}

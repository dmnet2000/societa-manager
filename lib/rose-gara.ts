import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { leggiRosa, salvaRosa, RosaValidationError } from "@/lib/db-rls/rosa";
import { leggiParametriGara, leggiParametriSquadra } from "@/lib/parametri-formato";
import type {
  GiocatoreSalvaRosa,
  ParametriFormato,
  RispostaRose,
  RosaGara,
  TesseratoSalvaRosa,
} from "@/lib/api-tablet/contratto";

// Referto elettronico, story 3.3 (AD-6, AD-17): servizio delle rose di una
// gara. Il client Supabase lo passa il chiamante (sessione del tablet o del
// sito): le rose passano solo da lib/db-rls, con le RLS. Mai nomi nei log.

export type LatoGara = "casa" | "ospite";

export type EsitoSalvataggioRosaGara = { esito: "ok" | "conflitto"; versione: number };

const ROSA_VUOTA: RosaGara = { versione: 0, giocatori: [], tesserati: [] };

async function squadreGara(garaId: string): Promise<{ casa: string; ospite: string }> {
  const partita = await prisma.partitaTorneo.findUnique({
    where: { id: garaId },
    select: { squadraCasaId: true, squadraOspiteId: true },
  });
  if (!partita) throw new Error("GARA_INESISTENTE");
  return { casa: partita.squadraCasaId, ospite: partita.squadraOspiteId };
}

function messaggioLiberi(min: number, max: number): string {
  if (max === 0) return "La rosa non può avere liberi.";
  if (min === max) return min === 1 ? "La rosa deve avere un libero." : `La rosa deve avere ${min} liberi.`;
  if (min === 0) return max === 1 ? "La rosa può avere al massimo un libero." : `La rosa può avere al massimo ${max} liberi.`;
  return `I liberi devono essere da ${min} a ${max}.`;
}

/**
 * Regole del formato per una rosa (uguali per tablet e sito): atleti massimi,
 * liberi, numeri di maglia unici, al massimo un capitano. Lancia
 * `RosaValidationError` con un messaggio italiano.
 */
export function controllaRegoleRosa(
  parametri: Pick<ParametriFormato, "rosaMax" | "liberiMin" | "liberiMax">,
  giocatori: readonly GiocatoreSalvaRosa[]
): void {
  const liberi = giocatori.filter((g) => g.libero).length;
  if (giocatori.length > parametri.rosaMax) {
    throw new RosaValidationError(
      `La rosa può avere al massimo ${parametri.rosaMax} giocatori.`
    );
  }
  if (liberi < parametri.liberiMin || liberi > parametri.liberiMax) {
    throw new RosaValidationError(messaggioLiberi(parametri.liberiMin, parametri.liberiMax));
  }
  // Stessi controlli della funzione SQL, ma con un messaggio da mostrare.
  const numeri = new Set(giocatori.map((g) => g.numero));
  if (numeri.size !== giocatori.length) {
    throw new RosaValidationError("Due giocatori hanno lo stesso numero di maglia.");
  }
  if (giocatori.filter((g) => g.capitano).length > 1) {
    throw new RosaValidationError("La rosa può avere un solo capitano.");
  }
}

/** Rose di casa e ospite; una rosa assente e `versione` 0 con liste vuote. */
export async function leggiRoseGara(
  supabase: SupabaseClient,
  garaId: string
): Promise<RispostaRose> {
  const squadre = await squadreGara(garaId);
  const [casa, ospite] = await Promise.all([
    leggiRosa(supabase, squadre.casa),
    leggiRosa(supabase, squadre.ospite),
  ]);
  return { casa: casa ?? ROSA_VUOTA, ospite: ospite ?? ROSA_VUOTA };
}

/**
 * Salva la rosa di un lato. Lancia `RosaValidationError` (messaggio italiano)
 * se non rispetta i parametri effettivi della gara, `RosaForbiddenError` se
 * le RLS negano; il conflitto torna come valore.
 */
export async function salvaRosaGara(
  supabase: SupabaseClient,
  args: {
    garaId: string;
    lato: LatoGara;
    versioneBase: number;
    idModifica: string;
    giocatori: readonly GiocatoreSalvaRosa[];
    tesserati: readonly TesseratoSalvaRosa[];
  }
): Promise<EsitoSalvataggioRosaGara> {
  const { garaId, lato, versioneBase, idModifica, giocatori, tesserati } = args;
  const parametri = await leggiParametriGara(garaId);
  if (parametri === null) throw new Error("GARA_INESISTENTE");

  controllaRegoleRosa(parametri, giocatori);

  const squadre = await squadreGara(garaId);
  return salvaRosa(
    supabase,
    squadre[lato],
    versioneBase,
    idModifica,
    giocatori.map((g) => ({ ...g })),
    tesserati.map((t) => ({ ...t }))
  );
}

/**
 * Salva la rosa di una Squadra (dal sito, story 3.9) con i parametri effettivi
 * della sua Categoria. Stessi errori di `salvaRosaGara`.
 */
export async function salvaRosaSquadra(
  supabase: SupabaseClient,
  args: {
    squadraId: string;
    versioneBase: number;
    idModifica: string;
    giocatori: readonly GiocatoreSalvaRosa[];
    tesserati: readonly TesseratoSalvaRosa[];
  }
): Promise<EsitoSalvataggioRosaGara> {
  const { squadraId, versioneBase, idModifica, giocatori, tesserati } = args;
  const parametri = await leggiParametriSquadra(squadraId);
  if (parametri === null) throw new Error("SQUADRA_INESISTENTE");
  controllaRegoleRosa(parametri, giocatori);
  return salvaRosa(
    supabase,
    squadraId,
    versioneBase,
    idModifica,
    giocatori.map((g) => ({ ...g })),
    tesserati.map((t) => ({ ...t }))
  );
}

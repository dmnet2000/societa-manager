import { prisma } from "@/lib/prisma";
import { Prisma } from "./prisma-engine-wasm";
import type { ParametriFormato } from "@/lib/api-tablet/contratto";

// Referto elettronico, story 3.1 (AD-5): parametri del formato di gara del
// modulo torneo. Default (regole-gara.md) in un'unica costante; l'Edizione li
// puo' sovrascrivere e la Categoria sovrascrive a sua volta l'Edizione.

export const CHIAVI_PARAMETRI_FORMATO = [
  "versione",
  "setPerVincere",
  "puntiSet",
  "puntiSetDecisivo",
  "scartoMinimo",
  "cambiPerSet",
  "timeoutPerSet",
  "liberiMin",
  "liberiMax",
  "rosaMax",
] as const satisfies readonly (keyof ParametriFormato)[];

export const PARAMETRI_FORMATO_DEFAULT: ParametriFormato = {
  versione: 1,
  setPerVincere: 2,
  puntiSet: 25,
  puntiSetDecisivo: 15,
  scartoMinimo: 2,
  cambiPerSet: 8,
  timeoutPerSet: 2,
  liberiMin: 1,
  liberiMax: 2,
  rosaMax: 14,
};

// Dal JSON del database si prendono solo le chiavi note con valore intero
// positivo: il resto (chiavi sconosciute, null, testo, decimali) si ignora.
export function chiaviValide(valore: unknown): Partial<ParametriFormato> {
  if (typeof valore !== "object" || valore === null || Array.isArray(valore)) return {};
  const sorgente = valore as Record<string, unknown>;
  const risultato: { -readonly [K in keyof ParametriFormato]?: number } = {};
  for (const chiave of CHIAVI_PARAMETRI_FORMATO) {
    // `versione` viene sempre dal default; `setPerVincere` solo 2 (AD-5).
    if (chiave === "versione") continue;
    const v = sorgente[chiave];
    if (chiave === "setPerVincere" && v !== 2) continue;
    if (typeof v === "number" && Number.isSafeInteger(v) && v >= 1) risultato[chiave] = v;
  }
  return risultato;
}

/** Parametri effettivi: default, poi Edizione, poi Categoria. Funzione pura. */
export function parametriEffettivi(edizione: unknown, categoria: unknown): ParametriFormato {
  const effettivi: ParametriFormato = {
    ...PARAMETRI_FORMATO_DEFAULT,
    ...chiaviValide(edizione),
    ...chiaviValide(categoria),
  };
  // Override che insieme darebbero liberiMin > liberiMax: il contratto li
  // rifiuterebbe sul tablet, si tornano ai default della coppia.
  if (effettivi.liberiMin > effettivi.liberiMax) {
    return {
      ...effettivi,
      liberiMin: PARAMETRI_FORMATO_DEFAULT.liberiMin,
      liberiMax: PARAMETRI_FORMATO_DEFAULT.liberiMax,
    };
  }
  return effettivi;
}

/**
 * Parametri effettivi della gara `garaId` (PartitaTorneo.id), letti da
 * categoria ed edizione. `null` se la gara non esiste.
 */
export async function leggiParametriGara(garaId: string): Promise<ParametriFormato | null> {
  const partita = await prisma.partitaTorneo.findUnique({
    where: { id: garaId },
    select: {
      categoriaTorneo: {
        select: {
          parametriFormato: true,
          edizioneTorneo: { select: { parametriFormato: true } },
        },
      },
    },
  });
  if (!partita) return null;
  const categoria = partita.categoriaTorneo;
  return parametriEffettivi(categoria.edizioneTorneo.parametriFormato, categoria.parametriFormato);
}

// Story 3.8: scrittura dei parametri impostati dall'Admin. Si salvano solo le
// chiavi impostate; nessuna chiave -> null del database (Prisma.DbNull).
function perDatabase(valori: Partial<ParametriFormato>) {
  return Object.keys(valori).length === 0 ? Prisma.DbNull : (valori as Prisma.InputJsonObject);
}

export async function salvaParametriEdizione(
  edizioneTorneoId: string,
  valori: Partial<ParametriFormato>
): Promise<{ count: number }> {
  return prisma.edizioneTorneo.updateMany({
    where: { id: edizioneTorneoId },
    data: { parametriFormato: perDatabase(valori) },
  });
}

/** Scoped sull'Edizione: una Categoria di un'altra Edizione da' count 0. */
export async function salvaParametriCategoria(
  categoriaTorneoId: string,
  edizioneTorneoId: string,
  valori: Partial<ParametriFormato>
): Promise<{ count: number }> {
  return prisma.categoriaTorneo.updateMany({
    where: { id: categoriaTorneoId, edizioneTorneoId },
    data: { parametriFormato: perDatabase(valori) },
  });
}

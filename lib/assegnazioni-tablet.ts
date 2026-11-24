import "server-only";
import { prisma } from "@/lib/prisma";
import { RUOLO_TABLET } from "@/lib/ruoli";

// Referto elettronico, story 2.5 (AD-2, AD-15): assegnazione delle gare del
// torneo (PartitaTorneo) a un utente TABLET, con l'epoca. Funzioni di
// lettura/scrittura del modulo torneo, senza validazione: i controlli (ruolo
// del chiamante, gara dell'Edizione, tablet attivo) vivono nella Server
// Action (app/app/(torneo)/torneo/actions.ts), stessa separazione di
// lib/torneo.ts.

// Tutte le gare di un'Edizione con quanto serve alla pagina di assegnazione:
// Categoria, squadre, Slot (palestra/campo) e assegnazione corrente col suo
// tablet. Ordinate per numero di gara, come gli altri elenchi del torneo.
export async function elencaGareConAssegnazioneTablet(edizioneTorneoId: string) {
  return prisma.partitaTorneo.findMany({
    where: { edizioneTorneoId },
    include: {
      categoriaTorneo: true,
      squadraCasa: true,
      squadraOspite: true,
      slotTorneo: { include: { palestra: true, campo: true } },
      assegnazioneTablet: {
        include: { utente: { select: { id: true, email: true, attivo: true } } },
      },
    },
    orderBy: [{ numero: "asc" }],
  });
}

// Utenti con ruolo TABLET, attivi e disattivati: la pagina mostra i
// disattivati solo sulla gara che hanno gia' (etichetta "(disattivato)").
export async function elencaTablet() {
  return prisma.utente.findMany({
    where: { ruoli: { some: { ruolo: RUOLO_TABLET } } },
    select: { id: true, email: true, attivo: true },
    orderBy: { email: "asc" },
  });
}

export async function trovaUtenteConRuoliPerId(id: string) {
  return prisma.utente.findUnique({
    where: { id },
    select: { id: true, attivo: true, ruoli: { select: { ruolo: true } } },
  });
}

export type EsitoAssegnazioneTablet = "creata" | "cambiata" | "invariata";

// Assegna la gara al tablet `utenteId`, o la lascia senza tablet con null.
// Ogni cambio fa crescere l'epoca di 1 nella stessa istruzione SQL
// (updateMany con increment), senza transazioni interattive (non usate nel
// progetto: Prisma via pooler su Workers). Stesso tablet, o "nessun tablet"
// su una gara gia' senza tablet: nessuna scrittura, epoca invariata.
export async function assegnaTabletPartita(
  partitaTorneoId: string,
  utenteId: string | null
): Promise<EsitoAssegnazioneTablet> {
  if (utenteId === null) {
    // Solo una riga che ha ancora un tablet cambia; nessuna riga o riga gia'
    // vuota = invariata (non si crea una riga per "nessun tablet").
    const tolta = await prisma.assegnazioneTablet.updateMany({
      where: { partitaTorneoId, utenteId: { not: null } },
      data: { utenteId: null, epoca: { increment: 1 } },
    });
    return tolta.count > 0 ? "cambiata" : "invariata";
  }

  // Riga esistente con un altro tablet o senza tablet. In SQL
  // "utenteId <> x" esclude i NULL, per questo serve l'OR esplicito.
  const cambia = () =>
    prisma.assegnazioneTablet.updateMany({
      where: {
        partitaTorneoId,
        OR: [{ utenteId: null }, { utenteId: { not: utenteId } }],
      },
      data: { utenteId, epoca: { increment: 1 } },
    });
  if ((await cambia()).count > 0) return "cambiata";

  // Nessuna riga da cambiare: o la gara e' gia' su questo tablet, o non ha
  // ancora una riga. skipDuplicates rende innocuo il primo caso (vincolo
  // unico su partitaTorneoId).
  const creata = await prisma.assegnazioneTablet.createMany({
    data: [{ partitaTorneoId, utenteId }],
    skipDuplicates: true,
  });
  if (creata.count > 0) return "creata";

  // Review fix: la riga puo' essere nata nel frattempo da un'altra
  // richiesta con un tablet diverso - si riprova il cambio una volta, cosi'
  // questa scelta si applica (epoca +1) invece di andare persa in silenzio.
  return (await cambia()).count > 0 ? "cambiata" : "invariata";
}

// L'utente oggi assegnato alla gara (null se nessuno o nessuna riga).
export async function trovaTabletAssegnato(partitaTorneoId: string): Promise<string | null> {
  const riga = await prisma.assegnazioneTablet.findUnique({
    where: { partitaTorneoId },
    select: { utenteId: true },
  });
  return riga?.utenteId ?? null;
}

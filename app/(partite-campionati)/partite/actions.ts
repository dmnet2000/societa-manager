"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAutorizzazioneGruppo } from "@/app/(partite-campionati)/autorizzazione";
import { parseDataIsoValida } from "@/lib/parse-data-iso";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type PartitaActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Stessa regex di app/(orari-palestre)/slot/actions.ts - nessun helper
// condiviso tra i due moduli per un singolo riuso (Dev Notes).
const FORMATO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Story 10.6 (AC #1/#4): cancella una singola Partita - colocata con
// /partite (suo unico consumatore), a differenza di creaCampionato/importaGare
// che vivono in campionati/ perche' consumate da /campionati. Stessa
// autorizzazione a due livelli gia' stabilita per creazione/import
// (risolviAutorizzazioneGruppo, Story 10.1/10.2), riusata invariata.
export async function cancellaPartita(
  _prevState: PartitaActionState,
  formData: FormData
): Promise<PartitaActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const partitaId = String(formData.get("partitaId") ?? "").trim();
  if (!partitaId) {
    return { error: { code: "VALIDATION", message: "Partita non specificata." } };
  }

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
    select: { gruppoId: true },
  });
  if (!partita) {
    return { error: { code: "VALIDATION", message: "Partita non trovata." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(partita.gruppoId, {
    permettiStagionePassata: true,
  });
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    await prisma.partita.delete({ where: { id: partitaId } });
  } catch (err) {
    // Review fix: stessa race TOCTOU gestita in cancellaCampionato - P2025
    // ("Record to delete does not exist") indica che la Partita e' gia'
    // stata cancellata da una richiesta concorrente; trattato come successo
    // idempotente, lo stato desiderato e' comunque gia' raggiunto.
    if ((err as { code?: string }).code === "P2025") {
      revalidatePath("/partite");
      return { success: true };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare la Partita. Riprova." },
    };
  }

  revalidatePath("/partite");
  return { success: true };
}

// Story 10.4 (AC #1-#4): modifica di data/ora/impianto/indirizzoImpianto di
// una Partita esistente - stessa autorizzazione a due livelli di
// cancellaPartita, ma SENZA permettiStagionePassata (vedi Dev Notes: qui il
// blocco su Gruppi di stagioni passate resta invariato per tutti i Ruoli,
// stesso comportamento di creaCampionato/importaGare). garaNumero/
// campionatoId/squadraCasa/squadraOspite non sono esposti dal form (AC #3).
export async function aggiornaPartita(
  _prevState: PartitaActionState,
  formData: FormData
): Promise<PartitaActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const partitaId = String(formData.get("partitaId") ?? "").trim();
  if (!partitaId) {
    return { error: { code: "VALIDATION", message: "Partita non specificata." } };
  }

  const partita = await prisma.partita.findUnique({
    where: { id: partitaId },
    select: { gruppoId: true },
  });
  if (!partita) {
    return { error: { code: "VALIDATION", message: "Partita non trovata." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(partita.gruppoId);
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  const data = String(formData.get("data") ?? "").trim();
  if (!parseDataIsoValida(data)) {
    return { error: { code: "VALIDATION", message: "Data non valida." } };
  }

  const ora = String(formData.get("ora") ?? "").trim();
  if (!FORMATO_ORA.test(ora)) {
    return { error: { code: "VALIDATION", message: "Formato ora non valido (usa HH:MM)." } };
  }

  const impianto = String(formData.get("impianto") ?? "").trim() || null;
  const indirizzoImpianto =
    String(formData.get("indirizzoImpianto") ?? "").trim() || null;

  try {
    await prisma.partita.update({
      where: { id: partitaId },
      data: { data, ora, impianto, indirizzoImpianto },
    });
  } catch (err) {
    // Review fix (code review Story 10.4): stessa race TOCTOU gestita in
    // cancellaPartita - P2025 indica che la Partita e' stata cancellata da
    // una richiesta concorrente tra il findUnique iniziale e questo update.
    // A differenza della cancellazione, qui non esiste un "successo
    // idempotente" possibile (non c'e' piu' nulla da salvare) - stesso
    // messaggio gia' restituito sopra quando la Partita non viene trovata.
    if ((err as { code?: string }).code === "P2025") {
      return { error: { code: "VALIDATION", message: "Partita non trovata." } };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Partita. Riprova." },
    };
  }

  revalidatePath("/partite");
  return { success: true };
}

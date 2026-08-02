"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAutorizzazioneGruppo } from "@/app/(partite-campionati)/autorizzazione";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type PartitaActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

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

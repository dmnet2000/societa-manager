"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { risolviAutorizzazioneGruppo } from "@/app/(partite-campionati)/autorizzazione";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type CampionatoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1: crea un nuovo Campionato, associato all'Anno Agonistico corrente
// (risolviAnnoAgonisticoCorrente, lib/anno-agonistico - riuso invariato,
// stesso pattern di creaGruppo), e collegato direttamente al Gruppo indicato
// (Story 10.7: gruppoId diretto su Campionato, non più una riga di giunzione
// separata - "Collega Campionato esistente" è stato rimosso).
export async function creaCampionato(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const gruppoId = String(formData.get("gruppoId") ?? "").trim();

  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Campionato è obbligatorio." },
    };
  }
  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(gruppoId);
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    // Story 10.7 (AC #3/#4): scoped anche a gruppoId, non solo nome+stagione
    // - un Campionato appartiene ora a un solo Gruppo (nessuna condivisione),
    // quindi due Gruppi diversi possono avere Campionati omonimi nella
    // stessa stagione; il duplicato va bloccato solo per lo stesso Gruppo.
    const esistente = await prisma.campionato.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        annoAgonisticoId: autorizzazione.annoCorrenteId,
        gruppoId,
      },
    });
    if (esistente) {
      return {
        error: {
          code: "VALIDATION",
          message: "Esiste già un Campionato con questo nome per questo Gruppo in questa stagione.",
        },
      };
    }

    const anno = await risolviAnnoAgonisticoCorrente();
    // Story 10.7: singola scrittura (gruppoId è ora un campo diretto di
    // Campionato) - nessuna $transaction necessaria, a differenza della
    // Story 10.1 che creava due righe distinte (Campionato + GruppoCampionato).
    await prisma.campionato.create({
      data: { nome, annoAgonisticoId: anno.id, gruppoId },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare il Campionato. Riprova." },
    };
  }

  revalidatePath("/campionati");
  return { success: true };
}

// Story 10.6 (AC #2/#4): cancella un Campionato e, a cascata, tutte le sue
// Partite - Campionato.gruppoId e' una FK diretta (Story 10.7), quindi
// cancellarlo non impatta mai un altro Gruppo. Partita.campionatoId ha
// ON DELETE CASCADE (prisma/schema.prisma, Story 10.2) - un solo delete
// basta, Postgres rimuove automaticamente le Partite collegate.
export async function cancellaCampionato(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const campionatoId = String(formData.get("campionatoId") ?? "").trim();
  if (!campionatoId) {
    return { error: { code: "VALIDATION", message: "Campionato non specificato." } };
  }

  const campionato = await prisma.campionato.findUnique({
    where: { id: campionatoId },
    select: { gruppoId: true },
  });
  if (!campionato) {
    return { error: { code: "VALIDATION", message: "Campionato non trovato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(campionato.gruppoId, {
    permettiStagionePassata: true,
  });
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    await prisma.campionato.delete({ where: { id: campionatoId } });
  } catch (err) {
    // Review fix: race TOCTOU (due cancellazioni concorrenti sullo stesso
    // Campionato) - P2002 su un secondo delete non esiste, Prisma solleva
    // P2025 ("Record to delete does not exist") se la riga e' gia' sparita.
    // Trattato come successo idempotente: lo stato desiderato (Campionato
    // non piu' esistente) e' comunque gia' raggiunto, stesso principio gia'
    // usato per P2002 in collegaCampionatoEsistente (Story 10.1, ora rimossa
    // ma il pattern resta il riferimento per le race su scritture Campionato).
    if ((err as { code?: string }).code === "P2025") {
      revalidatePath("/campionati");
      return { success: true };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare il Campionato. Riprova." },
    };
  }

  // Stesso pattern di importaGare (Story 10.2): revalida solo /campionati,
  // non /partite (che si affida a force-dynamic per restare aggiornata,
  // Dev Notes Story 10.3) - nessuna incoerenza nuova introdotta qui.
  revalidatePath("/campionati");
  return { success: true };
}

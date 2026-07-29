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
// stesso pattern di creaGruppo), e lo collega subito al Gruppo indicato.
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
    // Review fix (Blind Hunter): l'AC #2 esiste proprio per evitare un
    // Campionato duplicato con lo stesso nome nella stessa stagione - senza
    // questo controllo, la regola era rispettata solo per convenzione UI
    // (il form "collega esistente"), non dall'azione stessa.
    const esistente = await prisma.campionato.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        annoAgonisticoId: autorizzazione.annoCorrenteId,
      },
    });
    if (esistente) {
      return {
        error: {
          code: "VALIDATION",
          message: "Esiste già un Campionato con questo nome in questa stagione - collegalo invece di crearne uno nuovo.",
        },
      };
    }

    const anno = await risolviAnnoAgonisticoCorrente();
    // Review fix (Blind Hunter): entrambe le scritture in un'unica
    // transazione - il precedente citato in origine (Story 1.1) non era
    // realmente analogo; wizard-nuova-stagione/actions.ts (Story 5.2) usa
    // $transaction esattamente per la stessa forma di rischio ("crea
    // entità padre, poi crea righe di giunzione che referenziano il suo
    // id" - un fallimento a metà non deve lasciare un Campionato orfano).
    await prisma.$transaction(async (tx) => {
      const campionato = await tx.campionato.create({
        data: { nome, annoAgonisticoId: anno.id },
      });
      await tx.gruppoCampionato.create({
        data: { gruppoId, campionatoId: campionato.id },
      });
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

// AC #2: collega un Gruppo a un Campionato già esistente (scelto da un
// elenco), invece di crearne uno duplicato con lo stesso nome.
export async function collegaCampionatoEsistente(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "").trim();
  const campionatoId = String(formData.get("campionatoId") ?? "").trim();

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!campionatoId) {
    return { error: { code: "VALIDATION", message: "Campionato non specificato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(gruppoId);
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    // Review fix (Blind Hunter + Edge Case Hunter): il Campionato scelto
    // deve appartenere alla stessa stagione del Gruppo target - l'elenco
    // "disponibili" in page.tsx filtra solo cosa viene offerto nel
    // <select>, una richiesta manomessa potrebbe altrimenti collegare un
    // Gruppo corrente a un Campionato di una stagione passata.
    const campionato = await prisma.campionato.findUnique({
      where: { id: campionatoId },
      select: { annoAgonisticoId: true },
    });
    if (!campionato || campionato.annoAgonisticoId !== autorizzazione.annoCorrenteId) {
      return {
        error: { code: "VALIDATION", message: "Campionato non trovato per la stagione corrente." },
      };
    }

    await prisma.gruppoCampionato.create({ data: { gruppoId, campionatoId } });
  } catch (err) {
    // AC #5: idempotente - un collegamento gia' esistente viola
    // @@unique([gruppoId, campionatoId]) (Prisma P2002), trattato come
    // successo invece di un check-then-insert che lascerebbe una finestra
    // di race (stesso pattern di assegnaAllenatore, Story 2.3).
    if ((err as { code?: string }).code !== "P2002") {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile collegare il Campionato. Riprova." },
      };
    }
  }

  revalidatePath("/campionati");
  return { success: true };
}

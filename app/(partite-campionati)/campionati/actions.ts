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

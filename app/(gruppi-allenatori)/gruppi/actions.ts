"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { prisma } from "@/lib/prisma";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type GruppoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1/#2: FR-6 ammette Dirigente o Admin. Gruppo non e' protetto da RLS
// (AD-9) - Prisma diretto, stesso pattern di creaPalestra (Story 2.1).
export async function creaGruppo(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  // Review fix: due controlli distinti invece di uno solo - altrimenti una
  // categoria mancante veniva segnalata con lo stesso messaggio di un nome
  // vuoto, fuorviante rispetto alla causa reale (stesso fix già applicato a
  // creaCampo, Story 2.1).
  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Gruppo è obbligatorio." },
    };
  }
  if (!categoria) {
    return {
      error: { code: "VALIDATION", message: "La categoria del Gruppo è obbligatoria." },
    };
  }

  try {
    // AC #2: risolve/crea l'Anno Agonistico corrente prima del Gruppo (AD-8,
    // motore condiviso gia' riusato da confermaIscrizione, Story 1.6) - non
    // reimplementare questa logica qui.
    const anno = await risolviAnnoAgonisticoCorrente();
    await prisma.gruppo.create({
      data: { nome, categoria, annoAgonisticoId: anno.id },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare il Gruppo. Riprova." },
    };
  }

  revalidatePath("/gruppi");
  return { success: true };
}

// AC #1/#2: FR-7 ammette Dirigente o Admin. GruppoAllenatore non e'
// protetta da RLS (AD-9) - Prisma diretto, stesso pattern di creaGruppo.
export async function assegnaAllenatore(
  _prevState: GruppoActionState,
  formData: FormData
): Promise<GruppoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "");
  const allenatoreId = String(formData.get("allenatoreId") ?? "");

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!allenatoreId) {
    return { error: { code: "VALIDATION", message: "Allenatore non specificato." } };
  }

  try {
    await prisma.gruppoAllenatore.create({ data: { gruppoId, allenatoreId } });
  } catch (err) {
    // AC #3: idempotente - un'assegnazione gia' esistente viola
    // @@unique([gruppoId, allenatoreId]) (Prisma P2002), trattato come
    // successo invece di un check-then-insert che lascerebbe una finestra
    // di race (stesso pattern di inserisciIscrizione, Story 1.6).
    if ((err as { code?: string }).code !== "P2002") {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile assegnare l'Allenatore. Riprova." },
      };
    }
  }

  revalidatePath("/gruppi");
  return { success: true };
}

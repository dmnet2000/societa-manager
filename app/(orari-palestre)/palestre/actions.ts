"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type PalestraActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1: Palestra/Campo non protette da RLS (AD-9) - Prisma diretto, stesso
// pattern di precaricaAllenatore (Story 1.4), non lib/db-rls/.
export async function creaPalestra(
  _prevState: PalestraActionState,
  formData: FormData
): Promise<PalestraActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const indirizzo = String(formData.get("indirizzo") ?? "").trim() || null;

  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome della Palestra è obbligatorio." },
    };
  }

  try {
    await prisma.palestra.create({ data: { nome, indirizzo } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare la Palestra. Riprova." },
    };
  }

  revalidatePath("/palestre");
  return { success: true };
}

// AC #3: un id inesistente genera un errore Prisma esplicito (P2025),
// catturato dal blocco try/catch generico - a differenza di
// aggiornaAtleta/disattivaIscrizione (Story 1.3/1.8), qui non serve un
// controllo separato "riga effettivamente modificata": quei controlli
// servivano a rilevare un rifiuto RLS silenzioso di PostgREST, non
// applicabile a Prisma diretto.
export async function aggiornaPalestra(
  _prevState: PalestraActionState,
  formData: FormData
): Promise<PalestraActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const indirizzo = String(formData.get("indirizzo") ?? "").trim() || null;

  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome della Palestra è obbligatorio." },
    };
  }

  try {
    await prisma.palestra.update({ where: { id }, data: { nome, indirizzo } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare la Palestra. Riprova." },
    };
  }

  revalidatePath("/palestre");
}

// AC #2: un palestraId inesistente genera un errore Prisma di violazione FK,
// catturato dal blocco try/catch generico - nessuna validazione preventiva
// separata dell'esistenza necessaria.
export async function creaCampo(
  _prevState: PalestraActionState,
  formData: FormData
): Promise<PalestraActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const palestraId = String(formData.get("palestraId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();

  // Review fix: due controlli distinti invece di uno solo - altrimenti un
  // palestraId mancante veniva segnalato con lo stesso messaggio di un nome
  // vuoto, fuorviante rispetto alla causa reale.
  if (!palestraId) {
    return {
      error: { code: "VALIDATION", message: "Palestra non specificata." },
    };
  }
  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Campo è obbligatorio." },
    };
  }

  try {
    await prisma.campo.create({ data: { nome, palestraId } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare il Campo. Riprova." },
    };
  }

  revalidatePath("/palestre");
  return { success: true };
}

export async function aggiornaCampo(
  _prevState: PalestraActionState,
  formData: FormData
): Promise<PalestraActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Campo è obbligatorio." },
    };
  }

  try {
    await prisma.campo.update({ where: { id }, data: { nome } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare il Campo. Riprova." },
    };
  }

  revalidatePath("/palestre");
}

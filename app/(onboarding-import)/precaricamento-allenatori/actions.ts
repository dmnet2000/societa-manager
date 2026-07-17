"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  isCodiceFiscaleValido,
  trovaAllenatorePerCodiceFiscale,
} from "@/lib/matching-codice-fiscale";
import { prisma } from "@/lib/prisma";

export type PrecaricaAllenatoreState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1, #2, #5: Allenatore non e' protetta da RLS (AD-9) - Prisma diretto,
// come Utente (Story 1.1/1.2), non un client Supabase/lib/db-rls (quello e'
// riservato alle tabelle RLS-protette come Atleta, Story 1.3).
export async function precaricaAllenatore(
  _prevState: PrecaricaAllenatoreState,
  formData: FormData
): Promise<PrecaricaAllenatoreState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const codiceFiscaleInput = String(formData.get("codiceFiscale") ?? "").trim();

  if (!nome || !codiceFiscaleInput) {
    return {
      error: {
        code: "VALIDATION",
        message: "Nome e Codice Fiscale sono obbligatori.",
      },
    };
  }

  const codiceFiscale = codiceFiscaleInput.toUpperCase();

  if (!isCodiceFiscaleValido(codiceFiscale)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Codice Fiscale non valido (deve essere di 16 caratteri alfanumerici).",
      },
    };
  }

  try {
    // AC #2: un Codice Fiscale gia' precaricato (utenteId nullo) o gia'
    // agganciato a un Utente registrato non deve generare un duplicato.
    const esistente = await trovaAllenatorePerCodiceFiscale(codiceFiscale);
    if (esistente) {
      return {
        error: {
          code: "VALIDATION",
          message: "Codice Fiscale già precaricato o già associato a un account.",
        },
      };
    }

    await prisma.allenatore.create({
      data: { nome, codiceFiscale, utenteId: null },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile precaricare l'Allenatore. Riprova.",
      },
    };
  }

  revalidatePath("/precaricamento-allenatori");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";

export type ConfermaTesseramentiState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 13.1 estensione (2026-08-06): la dipendenza obbligatoria
// dall'Iscrizione (decisione originale di apertura Epic 13) e' stata
// rimossa su richiesta esplicita dell'utente - il Tesseramento e'
// confermabile per qualunque Atleta, indipendentemente dallo stato della
// sua Iscrizione (colonna "Stato Iscrizione" resta solo informativa in
// pagina). Sostituita anche la conferma singola per-riga con una conferma
// massiva: la UI invia un checkbox per riga, questa azione conferma tutte
// le Atlete selezionate in un'unica submission.
export async function confermaTesseramenti(
  _prevState: ConfermaTesseramentiState,
  formData: FormData
): Promise<ConfermaTesseramentiState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const atletaIds = [...new Set(formData.getAll("atletaId").map(String))];
  if (atletaIds.length === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona almeno un'Atleta." },
    };
  }

  try {
    const anno = await risolviAnnoAgonisticoCorrente();

    // Idempotente (AC #4 originale, invariato): upsert con update no-op,
    // stesso principio della conferma singola sostituita. $transaction cosi'
    // una conferma multipla o va a buon fine per intero o non scrive nulla,
    // invece di lasciare un sottoinsieme confermato e l'altro no su un
    // errore a meta' batch.
    await prisma.$transaction(
      atletaIds.map((atletaId) =>
        prisma.tesseramento.upsert({
          where: {
            atletaId_annoAgonisticoId: { atletaId, annoAgonisticoId: anno.id },
          },
          create: { atletaId, annoAgonisticoId: anno.id },
          update: {},
        })
      )
    );
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile confermare i Tesseramenti selezionati. Riprova.",
      },
    };
  }

  revalidatePath("/app/conferma-tesseramenti");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { isGiornoSettimanaValido } from "@/lib/giorno-settimana";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type SlotActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const FORMATO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// AD-2: Orari-Palestre e' l'unico proprietario della mutazione di Slot,
// incluso il suo FK verso Gruppo - Gruppi-Allenatori lo legge ma non lo
// scrive mai. FR-2 ammette Dirigente o Admin, stesso pattern di creaPalestra/
// creaCampo (Story 2.1). Slot non e' protetto da RLS (AD-9) - Prisma diretto.
export async function creaSlot(
  _prevState: SlotActionState,
  formData: FormData
): Promise<SlotActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const giorno = String(formData.get("giorno") ?? "");
  const oraInizio = String(formData.get("oraInizio") ?? "").trim();
  const oraFine = String(formData.get("oraFine") ?? "").trim();
  const campoId = String(formData.get("campoId") ?? "");
  const gruppoId = String(formData.get("gruppoId") ?? "");

  // Controlli distinti per campo mancante (lezione consolidata dalle code
  // review di Story 2.1/2.2, applicata qui fin da subito).
  if (!giorno) {
    return { error: { code: "VALIDATION", message: "Il giorno è obbligatorio." } };
  }
  if (!oraInizio) {
    return {
      error: { code: "VALIDATION", message: "L'ora di inizio è obbligatoria." },
    };
  }
  if (!oraFine) {
    return { error: { code: "VALIDATION", message: "L'ora di fine è obbligatoria." } };
  }
  if (!campoId) {
    return { error: { code: "VALIDATION", message: "Il Campo è obbligatorio." } };
  }
  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Il Gruppo è obbligatorio." } };
  }

  // Review fix: un giorno non valido (form manomesso, POST diretto) veniva
  // castato all'enum senza controllo e arrivava a Prisma come valore
  // sconosciuto - stesso principio gia' applicato a Ruolo (lib/ruoli.ts,
  // Story 1.1): un cast diretto non protegge da dati malformati.
  if (!isGiornoSettimanaValido(giorno)) {
    return { error: { code: "VALIDATION", message: "Giorno non valido." } };
  }

  if (!FORMATO_ORA.test(oraInizio) || !FORMATO_ORA.test(oraFine)) {
    return {
      error: { code: "VALIDATION", message: "Formato ora non valido (usa HH:MM)." },
    };
  }

  // Confronto stringa valido su HH:MM zero-paddato (nessuna aritmetica su
  // orari necessaria - vedi Dev Notes: oraInizio/oraFine sono String, non
  // DateTime/@db.Time, per decisione deliberata).
  if (oraInizio >= oraFine) {
    return {
      error: {
        code: "VALIDATION",
        message: "L'ora di fine deve essere successiva all'ora di inizio.",
      },
    };
  }

  try {
    await prisma.slot.create({
      data: {
        giorno,
        oraInizio,
        oraFine,
        campoId,
        gruppoId,
      },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare lo Slot. Riprova." },
    };
  }

  revalidatePath("/slot");
  return { success: true };
}

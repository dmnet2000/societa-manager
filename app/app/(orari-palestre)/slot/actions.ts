"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { isGiornoSettimanaValido } from "@/lib/giorno-settimana";
import type { GiornoSettimana } from "@prisma/client";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione.
export type SlotActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const FORMATO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type CampiSlotValidati = {
  giorno: GiornoSettimana;
  oraInizio: string;
  oraFine: string;
  campoId: string;
  gruppoId: string;
};

// Story 9.13: validazione estratta da creaSlot (comportamento identico,
// nessun cambio) per essere riusata anche da aggiornaSlot - due copie della
// stessa validazione andrebbero tenute manualmente allineate ad ogni
// modifica futura.
function validaCampiSlot(
  formData: FormData
): { error: { code: string; message: string } } | { valori: CampiSlotValidati } {
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

  return { valori: { giorno, oraInizio, oraFine, campoId, gruppoId } };
}

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

  const validazione = validaCampiSlot(formData);
  if ("error" in validazione) return validazione;
  const { giorno, oraInizio, oraFine, campoId, gruppoId } = validazione.valori;

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

  revalidatePath("/app/slot");
  return { success: true };
}

// Story 9.13 (AC #1/#4): stessa validazione di creaSlot (helper condiviso),
// stesso perimetro di Ruoli. Review fix (decisione presa con l'utente):
// /storico-presenze legge giorno/oraInizio/oraFine/gruppo.nome facendo un
// join a runtime con lo Slot (non da uno snapshot salvato sulla Presenza) -
// modificare uno Slot che ha gia' Presenze registrate riscriverebbe
// silenziosamente come vengono visualizzate le presenze storiche. Bloccato
// con la stessa identica guardia atomica di cancellaSlot (updateMany con
// where composto, non un update semplice - evita la stessa finestra TOCTOU).
// Coerente con l'aspettativa che gli Slot vengano definiti a inizio stagione
// e non piu' toccati una volta che la stagione e' in corso.
export async function aggiornaSlot(
  _prevState: SlotActionState,
  formData: FormData
): Promise<SlotActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: { code: "VALIDATION", message: "Slot non specificato." } };
  }

  const validazione = validaCampiSlot(formData);
  if ("error" in validazione) return validazione;
  const { giorno, oraInizio, oraFine, campoId, gruppoId } = validazione.valori;

  try {
    const risultato = await prisma.slot.updateMany({
      where: { id, presenze: { none: {} } },
      data: { giorno, oraInizio, oraFine, campoId, gruppoId },
    });

    if (risultato.count === 0) {
      const slot = await prisma.slot.findUnique({ where: { id } });
      if (!slot) {
        return {
          error: { code: "INTERNAL", message: "Impossibile aggiornare lo Slot. Riprova." },
        };
      }
      return {
        error: {
          code: "VALIDATION",
          message:
            "Impossibile modificare: risultano già registrate una o più Presenze per questo Slot.",
        },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare lo Slot. Riprova." },
    };
  }

  revalidatePath("/app/slot");
  return { success: true };
}

// Story 9.13 (AC #2/#3): Presenza.slotId ha onDelete: Cascade
// (prisma/schema.prisma) - cancellare uno Slot con Presenze gia' registrate
// cancellerebbe silenziosamente lo storico, quindi va bloccato esplicitamente.
// Cancellazione atomica (deleteMany con where composto, non findUnique+delete
// separati - stesso identico pattern anti-TOCTOU di cancellaAllenatore,
// Story 9.9): tra un controllo separato e la delete potrebbe registrarsi una
// Presenza, rendendo la cancellazione non piu' sicura.
export async function cancellaSlot(
  _prevState: SlotActionState,
  formData: FormData
): Promise<SlotActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: { code: "VALIDATION", message: "Slot non specificato." } };
  }

  try {
    const risultato = await prisma.slot.deleteMany({
      where: { id, presenze: { none: {} } },
    });

    if (risultato.count === 0) {
      const slot = await prisma.slot.findUnique({ where: { id } });
      if (!slot) {
        return {
          error: { code: "INTERNAL", message: "Impossibile cancellare lo Slot. Riprova." },
        };
      }
      return {
        error: {
          code: "VALIDATION",
          message:
            "Impossibile cancellare: risultano già registrate una o più Presenze per questo Slot.",
        },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare lo Slot. Riprova." },
    };
  }

  revalidatePath("/app/slot");
  return { success: true };
}

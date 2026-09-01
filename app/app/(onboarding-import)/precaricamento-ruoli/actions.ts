"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  normalizzaEmailRuolo,
  trovaPrecaricamentoRuolo,
  RUOLI_BLOCCATI_SENZA_PRECARICAMENTO,
} from "@/lib/matching-email-ruolo";
import { prisma } from "@/lib/prisma";

export type PrecaricamentoRuoloActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

function ruoliValidiDaFormData(formData: FormData): Ruolo[] {
  const selezionati = formData.getAll("ruoli").map(String) as Ruolo[];
  return [
    ...new Set(
      selezionati.filter((r) => RUOLI_BLOCCATI_SENZA_PRECARICAMENTO.includes(r))
    ),
  ];
}

// Story 9.41 (AC #1/#2): niente `permessiConfigurabili` per questa rotta
// nuova (YAGNI, vedi Design Notes dello spec) - requireRuolo(["ADMIN"])
// hardcoded, mirror del trattamento ORIGINALE di /precaricamento-allenatori
// prima della Story 12.4. Le tre Server Action di questo file condividono
// deliberatamente la stessa protezione.
export async function precaricaRuolo(
  _prevState: PrecaricamentoRuoloActionState,
  formData: FormData
): Promise<PrecaricamentoRuoloActionState> {
  const forbidden = await requireRuolo(["ADMIN"]);
  if (forbidden) return forbidden;

  const emailInput = String(formData.get("email") ?? "").trim();
  const ruoli = ruoliValidiDaFormData(formData);

  if (!emailInput) {
    return { error: { code: "VALIDATION", message: "L'email è obbligatoria." } };
  }
  if (ruoli.length === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona almeno un Ruolo (Segreteria e/o Dirigente)." },
    };
  }

  const email = normalizzaEmailRuolo(emailInput);

  try {
    // AC #2 (I/O matrix): rifiuta se una qualunque combinazione (email,ruolo)
    // esiste gia' - un solo Ruolo duplicato basta a rifiutare l'intero invio,
    // nessuna creazione parziale.
    for (const ruolo of ruoli) {
      const esistente = await trovaPrecaricamentoRuolo(email, ruolo);
      if (esistente) {
        return {
          error: {
            code: "VALIDATION",
            message: "Questa email è già precaricata per almeno uno dei Ruoli selezionati.",
          },
        };
      }
    }

    await prisma.precaricamentoRuolo.createMany({
      data: ruoli.map((ruolo) => ({ email, ruolo, utenteId: null })),
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile precaricare l'email. Riprova." },
    };
  }

  revalidatePath("/app/precaricamento-ruoli");
  return { success: true };
}

// Story 9.41 (I/O matrix "Modifica dei Ruoli di una voce non agganciata"):
// l'email della voce NON e' modificabile (Boundaries "Never") - solo
// `emailOriginale` (hidden, invariata) identifica la voce, `ruoli` e' il
// nuovo insieme completo per quell'email.
export async function aggiornaPrecaricamentoRuolo(
  _prevState: PrecaricamentoRuoloActionState,
  formData: FormData
): Promise<PrecaricamentoRuoloActionState> {
  const forbidden = await requireRuolo(["ADMIN"]);
  if (forbidden) return forbidden;

  const emailOriginaleInput = String(formData.get("emailOriginale") ?? "").trim();
  const nuoviRuoli = ruoliValidiDaFormData(formData);

  if (!emailOriginaleInput) {
    return { error: { code: "VALIDATION", message: "Voce non valida." } };
  }
  if (nuoviRuoli.length === 0) {
    return {
      error: { code: "VALIDATION", message: "Seleziona almeno un Ruolo (Segreteria e/o Dirigente)." },
    };
  }

  const emailOriginale = normalizzaEmailRuolo(emailOriginaleInput);

  try {
    // Boundaries "Always": la voce si considera agganciata (bloccata da
    // modifica) se ALMENO UNA delle sue righe ha utenteId valorizzato.
    const righeEsistenti = await prisma.precaricamentoRuolo.findMany({
      where: { email: emailOriginale },
    });
    // Review fix (Edge Case Hunter): senza questo controllo, un
    // emailOriginale che non corrisponde a nessuna riga esistente (typo,
    // voce già cancellata da un'altra richiesta) faceva silenziosamente da
    // "createMany" invece di rifiutare - deleteMany su un where senza
    // corrispondenze è un no-op, createMany procedeva comunque.
    if (righeEsistenti.length === 0) {
      return { error: { code: "VALIDATION", message: "Voce non trovata." } };
    }
    if (righeEsistenti.some((riga) => riga.utenteId)) {
      return {
        error: {
          code: "VALIDATION",
          message: "Impossibile modificare: questa voce è già agganciata a un account registrato.",
        },
      };
    }

    await prisma.$transaction([
      prisma.precaricamentoRuolo.deleteMany({ where: { email: emailOriginale } }),
      prisma.precaricamentoRuolo.createMany({
        data: nuoviRuoli.map((ruolo) => ({ email: emailOriginale, ruolo, utenteId: null })),
      }),
    ]);
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare i Ruoli. Riprova." },
    };
  }

  revalidatePath("/app/precaricamento-ruoli");
  return { success: true };
}

export async function cancellaPrecaricamentoRuolo(
  _prevState: PrecaricamentoRuoloActionState,
  formData: FormData
): Promise<PrecaricamentoRuoloActionState> {
  const forbidden = await requireRuolo(["ADMIN"]);
  if (forbidden) return forbidden;

  const emailInput = String(formData.get("email") ?? "").trim();
  if (!emailInput) {
    return { error: { code: "VALIDATION", message: "Voce non valida." } };
  }
  const email = normalizzaEmailRuolo(emailInput);

  try {
    // Stesso accepted-risk check-then-act gia' presente altrove nel progetto
    // per pannelli Admin a bassa concorrenza (es. cancellaAllenatore, dove
    // pero' la cancellazione atomica e' possibile con un where compound - qui
    // "almeno una riga agganciata" richiede leggere l'intero gruppo prima).
    const righe = await prisma.precaricamentoRuolo.findMany({ where: { email } });
    if (righe.length === 0) {
      return { error: { code: "INTERNAL", message: "Impossibile cancellare. Riprova." } };
    }
    if (righe.some((riga) => riga.utenteId)) {
      return {
        error: {
          code: "VALIDATION",
          message: "Impossibile cancellare: questa voce è già agganciata a un account registrato.",
        },
      };
    }

    await prisma.precaricamentoRuolo.deleteMany({ where: { email } });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare. Riprova." },
    };
  }

  revalidatePath("/app/precaricamento-ruoli");
  return { success: true };
}

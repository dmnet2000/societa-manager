"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  isCodiceFiscaleValido,
  trovaAllenatorePerCodiceFiscale,
} from "@/lib/matching-codice-fiscale";
import { prisma } from "@/lib/prisma";

export type AllenatoreActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1, #2, #5: Allenatore non e' protetta da RLS (AD-9) - Prisma diretto,
// come Utente (Story 1.1/1.2), non un client Supabase/lib/db-rls (quello e'
// riservato alle tabelle RLS-protette come Atleta, Story 1.3).
export async function precaricaAllenatore(
  _prevState: AllenatoreActionState,
  formData: FormData
): Promise<AllenatoreActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const cognome = String(formData.get("cognome") ?? "").trim();
  const codiceFiscaleInput = String(formData.get("codiceFiscale") ?? "").trim();

  if (!nome || !cognome || !codiceFiscaleInput) {
    return {
      error: {
        code: "VALIDATION",
        message: "Nome, Cognome e Codice Fiscale sono obbligatori.",
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
      data: { nome, cognome, codiceFiscale, utenteId: null },
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

// Story 9.9 (AC #2): stesso pattern di validazione di precaricaAllenatore.
// Il controllo duplicato Codice Fiscale esclude l'Allenatore in modifica -
// altrimenti un Admin non potrebbe mai risalvare un Allenatore senza
// cambiargli il Codice Fiscale (trovaAllenatorePerCodiceFiscale trova sempre
// se stesso).
export async function aggiornaAllenatore(
  _prevState: AllenatoreActionState,
  formData: FormData
): Promise<AllenatoreActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cognome = String(formData.get("cognome") ?? "").trim();
  const codiceFiscaleInput = String(formData.get("codiceFiscale") ?? "").trim();

  if (!nome || !cognome || !codiceFiscaleInput) {
    return {
      error: {
        code: "VALIDATION",
        message: "Nome, Cognome e Codice Fiscale sono obbligatori.",
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
    const esistente = await trovaAllenatorePerCodiceFiscale(codiceFiscale);
    if (esistente && esistente.id !== id) {
      return {
        error: {
          code: "VALIDATION",
          message: "Codice Fiscale già precaricato o già associato a un account.",
        },
      };
    }

    await prisma.allenatore.update({
      where: { id },
      data: { nome, cognome, codiceFiscale },
    });
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile aggiornare l'Allenatore. Riprova.",
      },
    };
  }

  revalidatePath("/precaricamento-allenatori");
  return { success: true };
}

// Story 9.9 (AC #3, #4): primo hard-delete di un'entita' di dominio in
// questo progetto - confinato al solo caso sicuro (nessun aggancio, nessuna
// assegnazione), per via delle FK esistenti: GruppoAllenatore.allenatoreId
// ha onDelete: Cascade (cancellarlo romperebbe silenziosamente
// l'assegnazione), e un Allenatore agganciato (utenteId non nullo)
// scollegherebbe silenziosamente l'Utente dal proprio profilo.
export async function cancellaAllenatore(
  _prevState: AllenatoreActionState,
  formData: FormData
): Promise<AllenatoreActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const id = String(formData.get("id") ?? "");

  try {
    // Review fix: cancellazione atomica invece di findUnique+delete separati -
    // altrimenti tra il controllo e la delete un'assegnazione a un Gruppo
    // potrebbe intervenire (TOCTOU), cancellando un Allenatore non piu' sicuro
    // da rimuovere. Il where compound e' l'unica vera protezione.
    const risultato = await prisma.allenatore.deleteMany({
      where: { id, utenteId: null, gruppi: { none: {} } },
    });

    if (risultato.count === 0) {
      const allenatore = await prisma.allenatore.findUnique({
        where: { id },
        include: { gruppi: true },
      });

      if (!allenatore) {
        return {
          error: { code: "INTERNAL", message: "Impossibile cancellare l'Allenatore. Riprova." },
        };
      }

      const motivi: string[] = [];
      if (allenatore.utenteId) motivi.push("è già agganciato a un account");
      if (allenatore.gruppi.length > 0) motivi.push("è assegnato ad almeno un Gruppo");

      return {
        error: {
          code: "VALIDATION",
          message: `Impossibile cancellare: l'Allenatore ${motivi.join(" e ")}.`,
        },
      };
    }
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare l'Allenatore. Riprova." },
    };
  }

  revalidatePath("/precaricamento-allenatori");
  return { success: true };
}

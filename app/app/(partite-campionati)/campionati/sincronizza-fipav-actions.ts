"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAutorizzazioneGruppo } from "@/app/app/(partite-campionati)/autorizzazione";
import { sincronizzaCampionatoFipav } from "@/lib/sincronizza-gare-fipav/sincronizza";
import type { RigaScartata } from "@/lib/importa-gare/parser";

export type SincronizzaFipavState =
  | { error: { code: string; message: string } }
  | {
      success: true;
      create: number;
      aggiornate: number;
      bloccate: number;
      scartate: RigaScartata[];
    }
  | undefined;

// Story 10.11 (AC #1-#4): mirror diretto di importaGare (Story 10.2) - stessa
// autorizzazione a due livelli, stessa chiave/pattern di upsert (findUnique +
// update/create, stesso trattamento P2002 concorrente) - solo la sorgente
// (fetch HTML del portale FIPAV invece di un file Excel caricato) e la
// scrittura selettiva legata a modificataManualmente cambiano.
// Story 10.12: chiamante sottile di sincronizzaCampionatoFipav
// (lib/sincronizza-gare-fipav/sincronizza.ts) - questa Server Action resta
// responsabile solo di autorizzazione (requireRuolo/risolviAutorizzazioneGruppo,
// basati sulla sessione utente) + lookup Campionato + revalidatePath; il
// fetch/parsing/upsert vero e proprio vive nella funzione condivisa, riusata
// anche dal nuovo endpoint cron (app/api/cron/sincronizza-fipav), che non ha
// alcuna sessione utente da autorizzare in questo modo.
export async function sincronizzaGareFipav(
  _prevState: SincronizzaFipavState,
  formData: FormData
): Promise<SincronizzaFipavState> {
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

  // Story 10.7: stesso controllo di importaGare - il Campionato deve
  // effettivamente appartenere al Gruppo passato, non solo esistere.
  const campionato = await prisma.campionato.findUnique({
    where: { id: campionatoId },
    select: { gruppoId: true, linkFipav: true },
  });
  if (!campionato || campionato.gruppoId !== gruppoId) {
    return {
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    };
  }

  // AC #4: linkFipav vuoto -> rifiutato anche se l'azione viene invocata
  // direttamente (il bottone non compare nell'UI in questo caso, ma
  // l'autorizzazione server-side non puo' fare affidamento solo su quello).
  if (!campionato.linkFipav) {
    return {
      error: {
        code: "VALIDATION",
        message: "Nessun link al portale FIPAV impostato per questo Campionato.",
      },
    };
  }

  const risultato = await sincronizzaCampionatoFipav({
    gruppoId,
    campionatoId,
    linkFipav: campionato.linkFipav,
  });
  if ("error" in risultato) {
    return risultato;
  }

  revalidatePath("/app/campionati");
  // In piu' rispetto a importaGare: /app/partite mostra gli stessi dati.
  revalidatePath("/app/partite");
  return risultato;
}

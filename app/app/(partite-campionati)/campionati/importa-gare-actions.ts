"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAutorizzazioneGruppo } from "@/app/app/(partite-campionati)/autorizzazione";
import { analizzaFileGare, type RigaScartata } from "@/lib/importa-gare/parser";

export type ImportaGareState =
  | { error: { code: string; message: string } }
  | { success: true; create: number; aggiornate: number; scartate: RigaScartata[] }
  | undefined;

// AC #1/#2: import idempotente - una Partita esistente (stesso gruppoId +
// garaNumero) viene aggiornata, non duplicata, cosi' un reimport dello
// stesso file dopo un aggiornamento del calendario resta sicuro.
// AC #6: il Gruppo deve essere effettivamente proprietario del Campionato
// scelto (Campionato.gruppoId, Story 10.7) - un mismatch qui indicherebbe un
// form manomesso, non un caso d'uso legittimo dell'UI.
export async function importaGare(
  _prevState: ImportaGareState,
  formData: FormData
): Promise<ImportaGareState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const gruppoId = String(formData.get("gruppoId") ?? "").trim();
  const campionatoId = String(formData.get("campionatoId") ?? "").trim();
  const file = formData.get("file");

  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }
  if (!campionatoId) {
    return { error: { code: "VALIDATION", message: "Campionato non specificato." } };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: { code: "VALIDATION", message: "Seleziona un file Excel da importare." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(gruppoId);
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  // Story 10.7: Campionato ha ora un gruppoId diretto (non più una riga
  // gruppo_campionati separata) - stesso controllo, stessa sorgente di
  // errore, solo il modello dati sottostante cambia.
  const campionato = await prisma.campionato.findUnique({
    where: { id: campionatoId },
    select: { gruppoId: true },
  });
  if (!campionato || campionato.gruppoId !== gruppoId) {
    return {
      error: { code: "VALIDATION", message: "Questo Gruppo non è iscritto a questo Campionato." },
    };
  }

  let risultato;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    risultato = analizzaFileGare(buffer);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "VALIDATION",
        message:
          err instanceof Error
            ? err.message
            : "Impossibile leggere il file. Verifica che sia un export gare valido.",
      },
    };
  }

  let create = 0;
  let aggiornate = 0;

  try {
    for (const riga of risultato.righe) {
      // Review fix: chiave composita gruppoId+campionatoId+garaNumero (non
      // solo gruppoId+garaNumero) - un Gruppo puo' essere collegato a piu'
      // Campionati contemporaneamente (Story 10.1 AC #5) e "Gara N" e'
      // numerato per competizione, non globalmente: senza campionatoId un
      // Gara N che coincide per caso tra due Campionati diversi dello
      // stesso Gruppo avrebbe sovrascritto la Partita sbagliata.
      const chiave = {
        gruppoId_campionatoId_garaNumero: {
          gruppoId,
          campionatoId,
          garaNumero: riga.garaNumero,
        },
      };
      const esistente = await prisma.partita.findUnique({ where: chiave });
      if (esistente) {
        await prisma.partita.update({
          where: { id: esistente.id },
          data: { ...riga, campionatoId },
        });
        aggiornate++;
      } else {
        try {
          await prisma.partita.create({
            data: { ...riga, gruppoId, campionatoId },
          });
          create++;
        } catch (creaErr) {
          // Review fix: race TOCTOU tra il findUnique sopra e questo create
          // (doppio submit/import concorrente sullo stesso Gara N) - P2002
          // trattato come un aggiornamento idempotente invece di abortire
          // l'intero import, stesso principio gia' stabilito per
          // collegaCampionatoEsistente (Story 10.1).
          if ((creaErr as { code?: string }).code !== "P2002") {
            throw creaErr;
          }
          const concorrente = await prisma.partita.findUniqueOrThrow({
            where: chiave,
          });
          await prisma.partita.update({
            where: { id: concorrente.id },
            data: { ...riga, campionatoId },
          });
          aggiornate++;
        }
      }
    }
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Import interrotto: alcune Partite potrebbero non essere state salvate. Riprova.",
      },
    };
  }

  revalidatePath("/app/campionati");
  return { success: true, create, aggiornate, scartate: risultato.scartate };
}

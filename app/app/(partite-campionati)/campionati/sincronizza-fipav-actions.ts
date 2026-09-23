"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAutorizzazioneGruppo } from "@/app/app/(partite-campionati)/autorizzazione";
import { analizzaHtmlGareFipav } from "@/lib/sincronizza-gare-fipav/parser";
import type { RigaGaraImportata, RigaScartata } from "@/lib/importa-gare/parser";

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

  let html: string;
  try {
    // Mirror di risolviLinkMaps (app/(orari-palestre)/palestre/actions.ts) -
    // timeout piu' alto (10s, non 5s) perche' qui la risposta e' una pagina
    // HTML intera, non un semplice redirect-check.
    // Review fix (Blind Hunter + Edge Case Hunter): senza uno User-Agent
    // plausibile alcuni portali di federazioni filtrano la richiesta - non
    // riproducibile nei test (fetch mockato), ma un rischio concreto contro
    // il sito reale.
    const risposta = await fetch(campionato.linkFipav, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SocietaManagerBot/1.0)" },
    });
    if (!risposta.ok) {
      return {
        error: {
          code: "INTERNAL",
          message: `Il portale FIPAV ha risposto con un errore (${risposta.status}). Riprova più tardi.`,
        },
      };
    }
    html = await risposta.text();
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile raggiungere il portale FIPAV. Riprova più tardi.",
      },
    };
  }

  let risultato;
  try {
    risultato = analizzaHtmlGareFipav(html);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message:
          err instanceof Error
            ? err.message
            : "Impossibile interpretare la pagina del portale FIPAV.",
      },
    };
  }

  // Campi sempre scritti dall'upsert, indipendentemente da
  // modificataManualmente - nessun form li rende modificabili altrove
  // (Boundaries spec-10-11).
  function campiSempreScritti(riga: RigaGaraImportata) {
    return {
      campionatoId,
      giornata: riga.giornata,
      squadraCasa: riga.squadraCasa,
      squadraOspite: riga.squadraOspite,
      risultato: riga.risultato,
      parziali: riga.parziali,
      statoDescrizione: riga.statoDescrizione,
    };
  }

  // data/ora/impianto/indirizzoImpianto: scritti solo se la Partita
  // esistente non e' stata corretta a mano (Story 10.4).
  function campiBloccabili(riga: RigaGaraImportata) {
    return {
      data: riga.data,
      ora: riga.ora,
      impianto: riga.impianto,
      indirizzoImpianto: riga.indirizzoImpianto,
    };
  }

  let create = 0;
  let aggiornate = 0;
  let bloccate = 0;

  try {
    for (const riga of risultato.righe) {
      const chiave = {
        gruppoId_campionatoId_garaNumero: {
          gruppoId,
          campionatoId,
          garaNumero: riga.garaNumero,
        },
      };
      const esistente = await prisma.partita.findUnique({ where: chiave });
      if (esistente) {
        if (esistente.modificataManualmente) {
          bloccate++;
        }
        await prisma.partita.update({
          where: { id: esistente.id },
          data: {
            ...campiSempreScritti(riga),
            ...(esistente.modificataManualmente ? {} : campiBloccabili(riga)),
          },
        });
        aggiornate++;
      } else {
        try {
          await prisma.partita.create({
            data: { ...riga, gruppoId, campionatoId },
          });
          create++;
        } catch (creaErr) {
          // Review fix di importaGare, riusato identico: race TOCTOU tra il
          // findUnique sopra e questo create - P2002 trattato come un
          // aggiornamento idempotente invece di abortire l'intera sync.
          if ((creaErr as { code?: string }).code !== "P2002") {
            throw creaErr;
          }
          const concorrente = await prisma.partita.findUniqueOrThrow({ where: chiave });
          if (concorrente.modificataManualmente) {
            bloccate++;
          }
          await prisma.partita.update({
            where: { id: concorrente.id },
            data: {
              ...campiSempreScritti(riga),
              ...(concorrente.modificataManualmente ? {} : campiBloccabili(riga)),
            },
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
        message:
          "Sincronizzazione interrotta: alcune Partite potrebbero non essere state salvate. Riprova.",
      },
    };
  }

  revalidatePath("/app/campionati");
  // In piu' rispetto a importaGare: /app/partite mostra gli stessi dati.
  revalidatePath("/app/partite");
  return { success: true, create, aggiornate, bloccate, scartate: risultato.scartate };
}

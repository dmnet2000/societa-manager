import "server-only";
import { prisma } from "@/lib/prisma";
import { analizzaHtmlGareFipav } from "@/lib/sincronizza-gare-fipav/parser";
import type { RigaGaraImportata, RigaScartata } from "@/lib/importa-gare/parser";

// Story 10.12: logica centrale (fetch + parsing + upsert con la protezione
// modificataManualmente) estratta da sincronizzaGareFipav (Story 10.11,
// app/app/(partite-campionati)/campionati/sincronizza-fipav-actions.ts:70-213)
// in una funzione pura, senza alcuna autorizzazione (la fa il chiamante:
// requireRuolo/risolviAutorizzazioneGruppo per la Server Action esistente,
// CRON_SECRET per il nuovo endpoint app/api/cron/sincronizza-fipav - un cron
// non ha sessione utente, non potrebbe mai superare quei controlli). Stesso
// tipo di ritorno di oggi - i due chiamanti restano chiamanti sottili di
// questa funzione, mai due implementazioni parallele.
export type SincronizzaCampionatoFipavParams = {
  gruppoId: string;
  campionatoId: string;
  linkFipav: string;
};

export type SincronizzaCampionatoFipavResult =
  | { error: { code: string; message: string } }
  | {
      success: true;
      create: number;
      aggiornate: number;
      bloccate: number;
      scartate: RigaScartata[];
    };

export async function sincronizzaCampionatoFipav({
  gruppoId,
  campionatoId,
  linkFipav,
}: SincronizzaCampionatoFipavParams): Promise<SincronizzaCampionatoFipavResult> {
  let html: string;
  try {
    // Mirror di risolviLinkMaps (app/(orari-palestre)/palestre/actions.ts) -
    // timeout piu' alto (10s, non 5s) perche' qui la risposta e' una pagina
    // HTML intera, non un semplice redirect-check.
    // Review fix (Blind Hunter + Edge Case Hunter): senza uno User-Agent
    // plausibile alcuni portali di federazioni filtrano la richiesta - non
    // riproducibile nei test (fetch mockato), ma un rischio concreto contro
    // il sito reale.
    const risposta = await fetch(linkFipav, {
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

  return { success: true, create, aggiornate, bloccate, scartate: risultato.scartate };
}

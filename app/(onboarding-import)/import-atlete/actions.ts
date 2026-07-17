"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import {
  trovaPerCodiceFiscale,
  unisciCertificato,
} from "@/lib/matching-codice-fiscale";
import { creaAtleta, aggiornaAtleta, elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno, inserisciIscrizione } from "@/lib/db-rls/iscrizione";
import {
  risolviAnnoAgonisticoCorrente,
  trovaAnnoAgonisticoPrecedente,
} from "@/lib/anno-agonistico";
import { analizzaExportFederale, type RigaScartata } from "./parser";

export type ImportaAtleteState =
  | { error: { code: string; message: string } }
  | {
      success: true;
      create: number;
      aggiornate: number;
      riportate: number;
      scartate: RigaScartata[];
    }
  | undefined;

// AC #1/#2: riconosce le Under 13 dal testo libero di "categoria" (Story
// 1.3, export federale). Confini di parola (\b) e tolleranza per il
// trattino (review fix) per evitare falsi positivi ("Under 130") e falsi
// negativi ("Under-13"). Pattern comunque non verificato contro un
// campione reale con Under 13 (solo "Under 16" compare nei documenti di
// progetto) - vedi Dev Notes/Debug Log della Story 1.8 se il formato
// reale differisce ulteriormente.
const PATTERN_UNDER_13 = /\bunder[\s-]*13\b|\bu[\s-]*13\b/i;

// AC #4: FR-19 ammette Admin o Dirigente - requireRuolo (Story 1.2) esteso
// per accettare piu' Ruoli. La RLS su "atlete" (AD-4/AD-9) resta comunque il
// cancello finale, questo e' un secondo livello di difesa esplicito.
export async function importaAtlete(
  _prevState: ImportaAtleteState,
  formData: FormData
): Promise<ImportaAtleteState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE"]);
  if (forbidden) return forbidden;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: {
        code: "VALIDATION",
        message: "Seleziona un file Excel da importare.",
      },
    };
  }

  let risultato;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    risultato = await analizzaExportFederale(buffer);
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message: "Impossibile leggere il file. Verifica che sia un export valido.",
      },
    };
  }

  const supabase = await createClient();
  let create = 0;
  let aggiornate = 0;
  let riportate = 0;
  const codiciFiscaliImportati = new Set(
    risultato.righe.map((riga) => riga.codiceFiscale)
  );

  try {
    for (const riga of risultato.righe) {
      // "certificato" non e' un campo identitario di Atleta (AD-10) - non va
      // mai passato a creaAtleta/aggiornaAtleta, altrimenti PostgREST rifiuta
      // l'insert/update ("colonna non trovata" su "atlete").
      const { certificato, ...datiAtleta } = riga;

      const esistente = await trovaPerCodiceFiscale(
        supabase,
        riga.codiceFiscale
      );
      let atletaId: string;
      if (esistente) {
        await aggiornaAtleta(supabase, esistente.id, datiAtleta);
        atletaId = esistente.id;
        aggiornate++;
      } else {
        atletaId = await creaAtleta(supabase, datiAtleta);
        create++;
      }

      // Story 1.7 AC #1/#2/#3: il merge del certificato e' un'operazione
      // indipendente dalla create/update dell'Atleta - viene saltato (non
      // e' un errore) quando la riga non ha una data di fine validita'
      // parsabile.
      const dataFineValidita = certificato.dataFineValidita;
      if (dataFineValidita) {
        // Costante locale esplicita (review fix): garantisce a livello di
        // compilatore che dataFineValidita resti Date (non nullable) anche
        // dopo un refactor - un semplice spread di "certificato" dentro
        // l'if si affiderebbe al control-flow narrowing di TypeScript, che
        // non sopravvive a una destrutturazione intermedia.
        await unisciCertificato(supabase, atletaId, {
          ...certificato,
          dataFineValidita,
        });
      }
    }

    // AC #1/#2/#5: riporto automatico delle Under 13 assenti dall'export ma
    // iscritte nella stagione precedente (AD-8: risolvi-anno-agonistico
    // riusato da Story 1.6). Nessun Anno Agonistico precedente (prima
    // stagione in assoluto) -> nessun riporto tentato, non e' un errore.
    const annoCorrente = await risolviAnnoAgonisticoCorrente();
    const annoPrecedente = await trovaAnnoAgonisticoPrecedente(annoCorrente);
    if (annoPrecedente) {
      const iscrizioniPrecedenti = await elencaIscrizioniPerAnno(
        supabase,
        annoPrecedente.id
      );
      const atletaIdIscrittiPrecedente = new Set(
        iscrizioniPrecedenti.map((iscrizione) => iscrizione.atletaId)
      );
      const atlete = await elencaAtlete(supabase);
      for (const atleta of atlete) {
        const candidata =
          atletaIdIscrittiPrecedente.has(atleta.id) &&
          PATTERN_UNDER_13.test(atleta.categoria ?? "") &&
          !codiciFiscaliImportati.has(atleta.codiceFiscale);
        if (candidata) {
          // Review fix: inserisciIscrizione ora restituisce true solo se ha
          // davvero creato/riattivato una riga - senza questo controllo
          // "riportate" veniva incrementato anche sui no-op (riga gia'
          // attiva), rendendo il conteggio nel riepilogo (AC #3) inesatto.
          const creata = await inserisciIscrizione(
            supabase,
            atleta.id,
            annoCorrente.id
          );
          if (creata) {
            riportate++;
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: "INTERNAL",
        message:
          "Import interrotto: alcune Atlete potrebbero non essere state salvate. Riprova.",
      },
    };
  }

  revalidatePath("/import-atlete");
  return { success: true, create, aggiornate, riportate, scartate: risultato.scartate };
}

"use server";

import { revalidatePath } from "next/cache";
import type { Ruolo } from "@prisma/client";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { aggiornaDescrizioneStaff } from "@/lib/staff-descrizioni";

// Data & formati (ARCHITECTURE-SPINE.md): errori dei Server Action come
// { error: { code, message } }, "FORBIDDEN" riservato ai rifiuti di
// autorizzazione. Mirror strutturale di
// app/app/(configurazione)/menu-pubblico/actions.ts (Story 19.7).
export type DescrizioneStaffActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// Story 19.12 (Epic 19, Ruolo Site Manager): decisione esplicita 2026-08-20 -
// DIRIGENTE affiancato subito insieme a SITE_MANAGER/ADMIN, stesso principio
// di tutta l'Epic 19. A differenza di /app/foto-squadre (SITE_MANAGER-only),
// qui non c'e' un permesso preesistente di Admin/Dirigente da NON toccare
// (funzionalita' del tutto nuova).
const RUOLI_GESTIONE_STAFF_DESCRIZIONI: Ruolo[] = ["SITE_MANAGER", "ADMIN", "DIRIGENTE"];

// Stesso tetto di LUNGHEZZA_MASSIMA_ETICHETTA gia' in uso in
// menu-pubblico/actions.ts (Code Map della spec) - nessun limite invece sulla
// descrizione stessa (decisione esplicita, mirror di Sponsor.descrizione, ma
// senza il tetto di quest'ultima: qui la descrizione e' opzionale e senza
// limite di lunghezza, vedi Boundaries & Constraints della spec).
const LUNGHEZZA_MASSIMA_ETICHETTA_RUOLO = 40;

// Il campo hidden "ruoliAggiuntivi" (DescrizioneStaffForm.tsx) trasporta
// l'intero array come JSON - a differenza degli altri campi di questo
// progetto (sempre stringhe scalari), qui serve un parse esplicito prima di
// poter validare/salvare. Un JSON malformato o di forma inattesa (non un
// array di stringhe) e' un input corrotto/manomesso, non un errore utente
// "normale" - rifiutato qui, MAI passato a Prisma cosi' com'e'.
function leggiRuoliAggiuntivi(formData: FormData): string[] | null {
  const grezzo = String(formData.get("ruoliAggiuntivi") ?? "[]");
  let valore: unknown;
  try {
    valore = JSON.parse(grezzo);
  } catch {
    return null;
  }
  if (!Array.isArray(valore) || !valore.every((v) => typeof v === "string")) {
    return null;
  }
  return valore;
}

// I/O & Edge-Case Matrix (spec): "Etichetta ruolo aggiuntivo vuota/solo
// spazi" -> rifiutata, VALIDATION - DescrizioneStaffForm.tsx impedisce gia'
// di aggiungere un'etichetta vuota allo stato locale prima del submit, ma
// questo e' il vero cancello (un client modificato/bypassato non deve poter
// aggirare il controllo).
function validaRuoliAggiuntivi(ruoli: string[]): { code: string; message: string } | null {
  for (const ruolo of ruoli) {
    if (!ruolo.trim()) {
      return { code: "VALIDATION", message: "Un ruolo aggiuntivo non può essere vuoto." };
    }
    if (ruolo.trim().length > LUNGHEZZA_MASSIMA_ETICHETTA_RUOLO) {
      return {
        code: "VALIDATION",
        message: `Un ruolo aggiuntivo supera i ${LUNGHEZZA_MASSIMA_ETICHETTA_RUOLO} caratteri.`,
      };
    }
  }
  return null;
}

export async function aggiornaDescrizioneStaffAction(
  _prevState: DescrizioneStaffActionState,
  formData: FormData
): Promise<DescrizioneStaffActionState> {
  const forbidden = await requireRuolo(RUOLI_GESTIONE_STAFF_DESCRIZIONI);
  if (forbidden) return forbidden;

  const allenatoreId = String(formData.get("allenatoreId") ?? "");
  if (!allenatoreId) {
    return { error: { code: "VALIDATION", message: "Allenatore non valido." } };
  }

  // Nessun controllo che allenatoreId sia tra gli Allenatori-con-Gruppo-
  // nella-stagione-corrente (il filtro di staff-descrizioni/page.tsx): quel
  // filtro e' un affordance della UI di gestione ("nessun Gruppo a cui
  // associare visivamente la modifica", Boundaries & Constraints della
  // spec), non un confine di sicurezza - stesso precedente gia' stabilito da
  // risolviPossessoGruppo (gruppi/actions.ts) per i Ruoli privilegiati:
  // ADMIN/DIRIGENTE/SITE_MANAGER hanno gia' accesso ampio a ogni Allenatore,
  // nessuna restrizione di possesso aggiuntiva qui.

  // Nessun limite di lunghezza qui (decisione esplicita, Boundaries &
  // Constraints della spec) - il trim rimuove solo lo spazio bianco
  // accidentale ai margini, una descrizione tutta spazi diventa "nessuna
  // descrizione" (null), coerente con l'I/O matrix ("mostra solo quel campo,
  // non un vuoto per l'altro").
  const descrizioneGrezza = String(formData.get("descrizione") ?? "").trim();
  const descrizione = descrizioneGrezza.length > 0 ? descrizioneGrezza : null;

  const ruoliGrezzi = leggiRuoliAggiuntivi(formData);
  if (ruoliGrezzi === null) {
    return { error: { code: "VALIDATION", message: "Elenco ruoli aggiuntivi non valido." } };
  }

  const errore = validaRuoliAggiuntivi(ruoliGrezzi);
  if (errore) return { error: errore };

  const ruoliAggiuntivi = ruoliGrezzi.map((ruolo) => ruolo.trim());

  try {
    await aggiornaDescrizioneStaff(allenatoreId, { descrizione, ruoliAggiuntivi });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare i dati dello Staff. Riprova." },
    };
  }

  // La home pubblica "/staff" e' gia' force-dynamic (Story 18.10) - nessun
  // revalidatePath necessario li', stesso principio gia' documentato per
  // caricaFotoSquadraAction (gruppi/actions.ts, Story 18.4).
  revalidatePath("/app/staff-descrizioni");
  return { success: true };
}

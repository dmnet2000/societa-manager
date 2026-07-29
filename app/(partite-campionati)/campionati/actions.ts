"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  trovaAnnoAgonisticoCorrente,
  risolviAnnoAgonisticoCorrente,
} from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type CampionatoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

const NON_GESTISCE_GRUPPO = {
  code: "FORBIDDEN",
  message: "Non gestisci questo Gruppo.",
};

const GRUPPO_NON_TROVATO = {
  code: "VALIDATION",
  message: "Gruppo non trovato per la stagione corrente.",
};

type AutorizzazioneGruppo =
  | { autorizzato: true; annoCorrenteId: string }
  | { autorizzato: false; error: { code: string; message: string } };

// Autorizzazione a due livelli (Dev Notes Story 10.1), unificata con la
// verifica di esistenza/stagione del Gruppo (review fix, Blind Hunter +
// Edge Case Hunter): un solo fetch del Gruppo copre sia "il gruppoId esiste
// ed è della stagione corrente" (prima assente per il percorso Admin/
// Dirigente) sia, transitivamente, "l'Allenatore lo gestisce ORA" (le righe
// GruppoAllenatore non vengono mai cancellate al cambio stagione, ma un
// Gruppo di una stagione passata ha sempre un id diverso da quello di un
// Gruppo corrente - stesso Gruppo mai riportato da una stagione all'altra,
// vedi wizard-nuova-stagione - quindi verificare che il Gruppo target sia
// della stagione corrente esclude già di per sé i Gruppi storici). Avvolta
// per intero in try/catch (review fix, Edge Case Hunter): prima
// un'eccezione qui si propagava fuori dalla Server Action invece del
// contratto { error: { code, message } } rispettato ovunque nel progetto.
async function risolviAutorizzazioneGruppo(
  gruppoId: string
): Promise<AutorizzazioneGruppo> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const anno = await trovaAnnoAgonisticoCorrente();
    const gruppo = anno
      ? await prisma.gruppo.findUnique({
          where: { id: gruppoId },
          select: { annoAgonisticoId: true },
        })
      : null;

    if (!anno || !gruppo || gruppo.annoAgonisticoId !== anno.id) {
      return { autorizzato: false, error: GRUPPO_NON_TROVATO };
    }

    const ruoli = parseRuoli(user?.app_metadata?.ruoli);
    if (ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE")) {
      return { autorizzato: true, annoCorrenteId: anno.id };
    }

    const allenatore = user
      ? await prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
        })
      : null;

    if (!allenatore) {
      return { autorizzato: false, error: NON_GESTISCE_GRUPPO };
    }

    const possiede = await prisma.gruppoAllenatore.findUnique({
      where: { gruppoId_allenatoreId: { gruppoId, allenatoreId: allenatore.id } },
    });

    if (!possiede) {
      return { autorizzato: false, error: NON_GESTISCE_GRUPPO };
    }

    return { autorizzato: true, annoCorrenteId: anno.id };
  } catch (err) {
    console.error(err);
    return {
      autorizzato: false,
      error: { code: "INTERNAL", message: "Impossibile verificare i permessi. Riprova." },
    };
  }
}

// AC #1: crea un nuovo Campionato, associato all'Anno Agonistico corrente
// (risolviAnnoAgonisticoCorrente, lib/anno-agonistico - riuso invariato,
// stesso pattern di creaGruppo), e lo collega subito al Gruppo indicato.
export async function creaCampionato(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const nome = String(formData.get("nome") ?? "").trim();
  const gruppoId = String(formData.get("gruppoId") ?? "").trim();

  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Campionato è obbligatorio." },
    };
  }
  if (!gruppoId) {
    return { error: { code: "VALIDATION", message: "Gruppo non specificato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(gruppoId);
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    // Review fix (Blind Hunter): l'AC #2 esiste proprio per evitare un
    // Campionato duplicato con lo stesso nome nella stessa stagione - senza
    // questo controllo, la regola era rispettata solo per convenzione UI
    // (il form "collega esistente"), non dall'azione stessa.
    const esistente = await prisma.campionato.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        annoAgonisticoId: autorizzazione.annoCorrenteId,
      },
    });
    if (esistente) {
      return {
        error: {
          code: "VALIDATION",
          message: "Esiste già un Campionato con questo nome in questa stagione - collegalo invece di crearne uno nuovo.",
        },
      };
    }

    const anno = await risolviAnnoAgonisticoCorrente();
    // Review fix (Blind Hunter): entrambe le scritture in un'unica
    // transazione - il precedente citato in origine (Story 1.1) non era
    // realmente analogo; wizard-nuova-stagione/actions.ts (Story 5.2) usa
    // $transaction esattamente per la stessa forma di rischio ("crea
    // entità padre, poi crea righe di giunzione che referenziano il suo
    // id" - un fallimento a metà non deve lasciare un Campionato orfano).
    await prisma.$transaction(async (tx) => {
      const campionato = await tx.campionato.create({
        data: { nome, annoAgonisticoId: anno.id },
      });
      await tx.gruppoCampionato.create({
        data: { gruppoId, campionatoId: campionato.id },
      });
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile creare il Campionato. Riprova." },
    };
  }

  revalidatePath("/campionati");
  return { success: true };
}

// AC #2: collega un Gruppo a un Campionato già esistente (scelto da un
// elenco), invece di crearne uno duplicato con lo stesso nome.
export async function collegaCampionatoEsistente(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
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

  try {
    // Review fix (Blind Hunter + Edge Case Hunter): il Campionato scelto
    // deve appartenere alla stessa stagione del Gruppo target - l'elenco
    // "disponibili" in page.tsx filtra solo cosa viene offerto nel
    // <select>, una richiesta manomessa potrebbe altrimenti collegare un
    // Gruppo corrente a un Campionato di una stagione passata.
    const campionato = await prisma.campionato.findUnique({
      where: { id: campionatoId },
      select: { annoAgonisticoId: true },
    });
    if (!campionato || campionato.annoAgonisticoId !== autorizzazione.annoCorrenteId) {
      return {
        error: { code: "VALIDATION", message: "Campionato non trovato per la stagione corrente." },
      };
    }

    await prisma.gruppoCampionato.create({ data: { gruppoId, campionatoId } });
  } catch (err) {
    // AC #5: idempotente - un collegamento gia' esistente viola
    // @@unique([gruppoId, campionatoId]) (Prisma P2002), trattato come
    // successo invece di un check-then-insert che lascerebbe una finestra
    // di race (stesso pattern di assegnaAllenatore, Story 2.3).
    if ((err as { code?: string }).code !== "P2002") {
      console.error(err);
      return {
        error: { code: "INTERNAL", message: "Impossibile collegare il Campionato. Riprova." },
      };
    }
  }

  revalidatePath("/campionati");
  return { success: true };
}

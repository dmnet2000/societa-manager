"use server";

import { revalidatePath } from "next/cache";
import { requireRuolo } from "@/lib/auth/require-ruolo";
import { prisma } from "@/lib/prisma";
import { risolviAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { risolviAutorizzazioneGruppo } from "@/app/(partite-campionati)/autorizzazione";

// Data & formati (ARCHITECTURE-SPINE.md): errori come { error: { code, message } }.
export type CampionatoActionState =
  | { error: { code: string; message: string } }
  | { success: true }
  | undefined;

// AC #1: crea un nuovo Campionato, associato all'Anno Agonistico corrente
// (risolviAnnoAgonisticoCorrente, lib/anno-agonistico - riuso invariato,
// stesso pattern di creaGruppo), e collegato direttamente al Gruppo indicato
// (Story 10.7: gruppoId diretto su Campionato, non più una riga di giunzione
// separata - "Collega Campionato esistente" è stato rimosso).
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
    // Story 10.7 (AC #3/#4): scoped anche a gruppoId, non solo nome+stagione
    // - un Campionato appartiene ora a un solo Gruppo (nessuna condivisione),
    // quindi due Gruppi diversi possono avere Campionati omonimi nella
    // stessa stagione; il duplicato va bloccato solo per lo stesso Gruppo.
    const esistente = await prisma.campionato.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        annoAgonisticoId: autorizzazione.annoCorrenteId,
        gruppoId,
      },
    });
    if (esistente) {
      return {
        error: {
          code: "VALIDATION",
          message: "Esiste già un Campionato con questo nome per questo Gruppo in questa stagione.",
        },
      };
    }

    const anno = await risolviAnnoAgonisticoCorrente();
    // Story 10.7: singola scrittura (gruppoId è ora un campo diretto di
    // Campionato) - nessuna $transaction necessaria, a differenza della
    // Story 10.1 che creava due righe distinte (Campionato + GruppoCampionato).
    await prisma.campionato.create({
      data: { nome, annoAgonisticoId: anno.id, gruppoId },
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

const LUNGHEZZA_MASSIMA_LINK_FIPAV = 500;

// Review fix (Blind Hunter + Edge Case Hunter, trovato indipendentemente da
// entrambi): linkFipav e' testo libero reso poi come href cliccabile
// (ModificaCampionatoForm.tsx) - senza questo controllo un valore
// "javascript:..."/"data:..." verrebbe salvato ed eseguito nella sessione di
// chiunque clicchi il link. type="url" lato client non e' una protezione
// (accetta comunque "javascript:" per grammatica WHATWG, ed e' comunque
// bypassabile chiamando la Server Action direttamente) - la validazione deve
// vivere qui. Richiede esplicitamente http/https (un valore senza schema
// diventerebbe un link relativo silenzioso, mai segnalato come errore).
function linkFipavValido(valore: string): boolean {
  if (valore.length > LUNGHEZZA_MASSIMA_LINK_FIPAV) return false;
  try {
    const url = new URL(valore);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Story 10.8 (AC: #1, #2, #3, #4): stile Server Action di update ispirato ad
// aggiornaPalestra (app/(orari-palestre)/palestre/actions.ts) - con una
// differenza reale, non solo di stile: a differenza di aggiornaPalestra/
// aggiornaCampo (che non ritornano mai { success: true } sul percorso
// felice, cadono su un undefined implicito), questa funzione lo ritorna
// esplicitamente - e' cio' che permette il ricollasso automatico di
// ModificaCampionatoForm dopo un salvataggio riuscito. Il PERIMETRO di
// autorizzazione e' invece quello gia' in vigore per
// creaCampionato/cancellaCampionato sopra e sotto (risolviAutorizzazioneGruppo,
// Allenatore limitato al proprio Gruppo, Admin/Dirigente ad accesso ampio),
// non quello Admin/Dirigente-only di aggiornaPalestra. permettiStagionePassata:
// true (stesso principio di cancellaCampionato, AC #4 di Story 10.6) - una
// correzione di nome/link non deve essere bloccata solo perche' il
// Campionato appartiene a una stagione passata.
export async function aggiornaCampionato(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const campionatoId = String(formData.get("campionatoId") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  // AC #3: stringa vuota rimuove il link (torna a nessun link), non un
  // valore letterale vuoto - stesso principio di salvaNomeSettoreAction/
  // salvaEmailSegreteriaAction.
  const linkFipavGrezzo = String(formData.get("linkFipav") ?? "").trim();
  const linkFipav = linkFipavGrezzo || null;

  if (!campionatoId) {
    return { error: { code: "VALIDATION", message: "Campionato non specificato." } };
  }
  if (!nome) {
    return {
      error: { code: "VALIDATION", message: "Il nome del Campionato è obbligatorio." },
    };
  }
  if (linkFipav && !linkFipavValido(linkFipav)) {
    return {
      error: {
        code: "VALIDATION",
        message: "Il link al portale FIPAV non è valido (deve iniziare con http:// o https://).",
      },
    };
  }

  const campionato = await prisma.campionato.findUnique({
    where: { id: campionatoId },
    select: { gruppoId: true, annoAgonisticoId: true },
  });
  if (!campionato) {
    return { error: { code: "VALIDATION", message: "Campionato non trovato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(campionato.gruppoId, {
    permettiStagionePassata: true,
  });
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  // Review fix (Blind Hunter + Edge Case Hunter, trovato indipendentemente
  // da entrambi): creaCampionato blocca un nome duplicato per lo stesso
  // Gruppo/stagione - senza lo stesso controllo qui, rinominare un
  // Campionato può fargli collidere silenziosamente con un fratello.
  // Escluso il Campionato stesso dal confronto (id: { not: campionatoId }).
  const duplicato = await prisma.campionato.findFirst({
    where: {
      id: { not: campionatoId },
      nome: { equals: nome, mode: "insensitive" },
      annoAgonisticoId: campionato.annoAgonisticoId,
      gruppoId: campionato.gruppoId,
    },
  });
  if (duplicato) {
    return {
      error: {
        code: "VALIDATION",
        message: "Esiste già un Campionato con questo nome per questo Gruppo in questa stagione.",
      },
    };
  }

  try {
    await prisma.campionato.update({
      where: { id: campionatoId },
      data: { nome, linkFipav },
    });
  } catch (err) {
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile aggiornare il Campionato. Riprova." },
    };
  }

  revalidatePath("/campionati");
  return { success: true };
}

// Story 10.6 (AC #2/#4): cancella un Campionato e, a cascata, tutte le sue
// Partite - Campionato.gruppoId e' una FK diretta (Story 10.7), quindi
// cancellarlo non impatta mai un altro Gruppo. Partita.campionatoId ha
// ON DELETE CASCADE (prisma/schema.prisma, Story 10.2) - un solo delete
// basta, Postgres rimuove automaticamente le Partite collegate.
export async function cancellaCampionato(
  _prevState: CampionatoActionState,
  formData: FormData
): Promise<CampionatoActionState> {
  const forbidden = await requireRuolo(["ADMIN", "DIRIGENTE", "ALLENATORE"]);
  if (forbidden) return forbidden;

  const campionatoId = String(formData.get("campionatoId") ?? "").trim();
  if (!campionatoId) {
    return { error: { code: "VALIDATION", message: "Campionato non specificato." } };
  }

  const campionato = await prisma.campionato.findUnique({
    where: { id: campionatoId },
    select: { gruppoId: true },
  });
  if (!campionato) {
    return { error: { code: "VALIDATION", message: "Campionato non trovato." } };
  }

  const autorizzazione = await risolviAutorizzazioneGruppo(campionato.gruppoId, {
    permettiStagionePassata: true,
  });
  if (!autorizzazione.autorizzato) return { error: autorizzazione.error };

  try {
    await prisma.campionato.delete({ where: { id: campionatoId } });
  } catch (err) {
    // Review fix: race TOCTOU (due cancellazioni concorrenti sullo stesso
    // Campionato) - P2002 su un secondo delete non esiste, Prisma solleva
    // P2025 ("Record to delete does not exist") se la riga e' gia' sparita.
    // Trattato come successo idempotente: lo stato desiderato (Campionato
    // non piu' esistente) e' comunque gia' raggiunto, stesso principio gia'
    // usato per P2002 in collegaCampionatoEsistente (Story 10.1, ora rimossa
    // ma il pattern resta il riferimento per le race su scritture Campionato).
    if ((err as { code?: string }).code === "P2025") {
      revalidatePath("/campionati");
      return { success: true };
    }
    console.error(err);
    return {
      error: { code: "INTERNAL", message: "Impossibile cancellare il Campionato. Riprova." },
    };
  }

  // Stesso pattern di importaGare (Story 10.2): revalida solo /campionati,
  // non /partite (che si affida a force-dynamic per restare aggiornata,
  // Dev Notes Story 10.3) - nessuna incoerenza nuova introdotta qui.
  revalidatePath("/campionati");
  return { success: true };
}

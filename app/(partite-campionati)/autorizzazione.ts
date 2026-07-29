import "server-only";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { parseRuoli } from "@/lib/ruoli";

const NON_GESTISCE_GRUPPO = {
  code: "FORBIDDEN",
  message: "Non gestisci questo Gruppo.",
};

const GRUPPO_NON_TROVATO = {
  code: "VALIDATION",
  message: "Gruppo non trovato per la stagione corrente.",
};

export type AutorizzazioneGruppo =
  | { autorizzato: true; annoCorrenteId: string }
  | { autorizzato: false; error: { code: string; message: string } };

// Estratta da app/(partite-campionati)/campionati/actions.ts (Story 10.1) -
// riusata anche dalla Server Action di import gare (Story 10.2), stesso
// comportamento identico, nessun cambio.
//
// Autorizzazione a due livelli, unificata con la verifica di esistenza/
// stagione del Gruppo (review fix Story 10.1, Blind Hunter + Edge Case
// Hunter): un solo fetch del Gruppo copre sia "il gruppoId esiste ed è
// della stagione corrente" (prima assente per il percorso Admin/Dirigente)
// sia, transitivamente, "l'Allenatore lo gestisce ORA" (le righe
// GruppoAllenatore non vengono mai cancellate al cambio stagione, ma un
// Gruppo di una stagione passata ha sempre un id diverso da quello di un
// Gruppo corrente - stesso Gruppo mai riportato da una stagione all'altra,
// vedi wizard-nuova-stagione - quindi verificare che il Gruppo target sia
// della stagione corrente esclude già di per sé i Gruppi storici). Avvolta
// per intero in try/catch: un'eccezione qui non deve propagarsi fuori dalla
// Server Action invece del contratto { error: { code, message } }
// rispettato ovunque nel progetto.
export async function risolviAutorizzazioneGruppo(
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

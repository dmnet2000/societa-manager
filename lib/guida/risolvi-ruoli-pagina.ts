import "server-only";
import type { Ruolo } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";

// Story 17.2: helper per le pagine che non leggono gia' `ruoli` per la
// propria logica (la maggioranza delle 29 coperte da questa storia) e lo
// farebbero solo per risolvere il contenuto dell'aiuto contestuale.
// Fail-soft (mirror del fix applicato a /palestre in code review di Story
// 17.1): un errore di sessione disabilita solo l'icona "?" (nessun
// contenuto guida trovato per un elenco vuoto di Ruoli), non l'intera
// pagina - una funzione puramente cosmetica non deve mai romperla.
// Le pagine che gia' leggono `ruoli` per conto proprio (es. /sponsor,
// /campionati) continuano a farlo direttamente, non usano questo helper.
export async function risolviRuoliPerAiutoContestuale(): Promise<Ruolo[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
    }
    return parseRuoli(user?.app_metadata?.ruoli);
  } catch (err) {
    console.error(err);
    return [];
  }
}

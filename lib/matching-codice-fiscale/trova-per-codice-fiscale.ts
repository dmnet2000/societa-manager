import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AtletaRecord = {
  id: string;
  codiceFiscale: string;
  [key: string]: unknown;
};

// AD-5: modulo condiviso di matching Codice Fiscale, richiamato da Import
// (Story 1.3), Onboarding (Story 1.4/1.5) e Rollover (Story 1.8) - nessuno
// reimplementa la lookup localmente. Atleta e' protetta da RLS (AD-4/AD-9):
// il client Supabase passato deve normalmente avere la sessione dell'utente
// autenticato (mai una connessione Prisma diretta) - unica eccezione
// sanzionata: l'aggancio Genitore in registrazione (Story 1.5) lo richiama
// con un client service-role, perche' il Genitore non ha ancora una sessione
// ne' una policy RLS che gli permetta di leggere "atlete" a quel punto del
// flusso (vedi Dev Notes Story 1.5).
export async function trovaPerCodiceFiscale(
  supabase: SupabaseClient,
  codiceFiscale: string
): Promise<AtletaRecord | null> {
  // Normalizzato difensivamente qui (oltre che nel parser di Story 1.3):
  // questo modulo e' condiviso (AD-5) e verra' richiamato da altri punti
  // d'ingresso (form di Onboarding, Rollover) che potrebbero non
  // normalizzare a monte - senza questo, varianti di maiuscole/spazi
  // creerebbero un'Atleta duplicata invece di trovare quella esistente.
  const codiceFiscaleNormalizzato = codiceFiscale.trim().toUpperCase();

  const { data, error } = await supabase
    .from("atlete")
    .select("*")
    .eq("codiceFiscale", codiceFiscaleNormalizzato)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  trovaCertificatoPerAtleta,
  creaCertificato,
  aggiornaCertificato,
  type DatiCertificato,
} from "@/lib/db-rls/certificato-medico";

// AD-5: seconda operazione del motore condiviso di matching/merge, insieme
// a trovaPerCodiceFiscale (Story 1.3) - implementa la regola "vince la data
// piu' recente" di FR-22. Il chiamante (Story 1.7: importaAtlete) decide se
// invocarla: questa funzione non esclude a priori un dataFineValidita
// mancante, quella responsabilita' resta a chi la richiama.
export async function unisciCertificato(
  supabase: SupabaseClient,
  atletaId: string,
  datiCertificato: DatiCertificato
): Promise<void> {
  const esistente = await trovaCertificatoPerAtleta(supabase, atletaId);

  if (!esistente) {
    await creaCertificato(supabase, atletaId, datiCertificato);
    return;
  }

  // AC #1: aggiorna solo se la nuova data e' strettamente piu' recente di
  // quella esistente - altrimenti mantiene quella esistente, silenziosamente
  // (nessun errore, non e' una riga scartata).
  const dataEsistente = new Date(esistente.dataFineValidita as string);
  if (datiCertificato.dataFineValidita > dataEsistente) {
    // Merge per-campo, non sovrascrittura totale (review fix): una riga
    // dell'export più recente ma con modulo/mesiValidita/dataInizioValidita
    // vuoti per quella riga non deve azzerare valori corretti già salvati
    // da un import precedente - un campo nullo nella nuova riga significa
    // "nessuna informazione nuova", non "cancella il valore esistente".
    await aggiornaCertificato(supabase, esistente.id as string, {
      dataInizioValidita:
        datiCertificato.dataInizioValidita ??
        (esistente.dataInizioValidita
          ? new Date(esistente.dataInizioValidita as string)
          : null),
      dataFineValidita: datiCertificato.dataFineValidita,
      mesiValidita:
        datiCertificato.mesiValidita ?? (esistente.mesiValidita as number | null),
      modulo: datiCertificato.modulo ?? (esistente.modulo as string | null),
    });
  }
}

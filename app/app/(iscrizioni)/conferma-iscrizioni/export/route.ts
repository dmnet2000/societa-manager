import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { elencaNomiGruppiPerAtletaCorrenti } from "@/lib/nomi-gruppi-atleta";
import {
  calcolaIntervalloStagioneCorrente,
  trovaAnnoAgonisticoCorrente,
} from "@/lib/anno-agonistico";
import { componiExportIscrizioni } from "@/lib/export/iscrizioni";
import { rifiutaExportNonAutorizzato } from "@/lib/export/autorizza-export";
import { generaXlsx, nomeFileExport, rispostaDownloadXlsx } from "@/lib/export-xlsx";

// Story 28.2 (Epic 28): download Excel delle Iscrizioni della stagione
// corrente per tutte le Atlete non rimosse - stessi dati e stessi Ruoli di
// /app/conferma-iscrizioni.
export const dynamic = "force-dynamic";

export async function GET() {
  const rifiuto = await rifiutaExportNonAutorizzato("/app/conferma-iscrizioni");
  if (rifiuto) return rifiuto;

  try {
    const oggi = new Date();
    const supabase = await createClient();
    const [atlete, annoCorrente, gruppiPerAtleta] = await Promise.all([
      elencaAtlete(supabase),
      trovaAnnoAgonisticoCorrente(oggi),
      elencaNomiGruppiPerAtletaCorrenti(oggi),
    ]);
    // Come in pagina: senza Anno Agonistico corrente nessuna Atleta e'
    // iscritta.
    const iscrizioni = annoCorrente
      ? await elencaIscrizioniPerAnno(supabase, annoCorrente.id)
      : [];

    const foglio = componiExportIscrizioni(atlete, iscrizioni, gruppiPerAtleta);
    const annoInizio = calcolaIntervalloStagioneCorrente(oggi).dataInizio.getUTCFullYear();

    return rispostaDownloadXlsx(
      generaXlsx(foglio),
      nomeFileExport("iscrizioni", annoInizio)
    );
  } catch (err) {
    console.error(err);
    return new Response("Export non riuscito, riprova.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

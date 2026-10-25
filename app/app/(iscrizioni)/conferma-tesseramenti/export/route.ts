import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { elencaFederazioni } from "@/lib/federazioni";
import { colonneTesseramento, federazioniPerAtleta } from "@/lib/tesseramento";
import { elencaNomiGruppiPerAtletaCorrenti } from "@/lib/nomi-gruppi-atleta";
import {
  calcolaIntervalloStagioneCorrente,
  trovaAnnoAgonisticoCorrente,
} from "@/lib/anno-agonistico";
import { componiExportTesseramenti } from "@/lib/export/tesseramenti";
import { rifiutaExportNonAutorizzato } from "@/lib/export/autorizza-export";
import { generaXlsx, nomeFileExport, rispostaDownloadXlsx } from "@/lib/export-xlsx";

// Story 28.3 (Epic 28): download Excel dei Tesseramenti della stagione
// corrente per tutte le Atlete non rimosse - stessi dati, stesse colonne
// Federazione e stessi Ruoli (Admin/Dirigente, Segreteria esclusa) di
// /app/conferma-tesseramenti.
export const dynamic = "force-dynamic";

export async function GET() {
  const rifiuto = await rifiutaExportNonAutorizzato("/app/conferma-tesseramenti");
  if (rifiuto) return rifiuto;

  try {
    const oggi = new Date();
    const supabase = await createClient();
    const [atlete, annoCorrente, federazioni, gruppiPerAtleta] = await Promise.all([
      elencaAtlete(supabase),
      trovaAnnoAgonisticoCorrente(oggi),
      elencaFederazioni(),
      elencaNomiGruppiPerAtletaCorrenti(oggi),
    ]);
    // Come in pagina: senza Anno Agonistico corrente nessuna Atleta e'
    // iscritta ne' tesserata.
    const [iscrizioni, tesseramenti] = annoCorrente
      ? await Promise.all([
          elencaIscrizioniPerAnno(supabase, annoCorrente.id),
          federazioniPerAtleta(annoCorrente.id),
        ])
      : [[], new Map<string, string[]>()];

    const foglio = componiExportTesseramenti(
      atlete,
      new Set(iscrizioni.map((iscrizione) => iscrizione.atletaId)),
      tesseramenti,
      colonneTesseramento(federazioni, tesseramenti),
      gruppiPerAtleta
    );
    const annoInizio = calcolaIntervalloStagioneCorrente(oggi).dataInizio.getUTCFullYear();

    return rispostaDownloadXlsx(
      generaXlsx(foglio),
      nomeFileExport("tesseramenti", annoInizio)
    );
  } catch (err) {
    console.error(err);
    return new Response("Export non riuscito, riprova.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

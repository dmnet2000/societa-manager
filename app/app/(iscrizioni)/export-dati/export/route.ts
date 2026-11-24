import { createClient } from "@/lib/supabase/server";
import { elencaAnagraficaAtleteExport } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { elencaFederazioni } from "@/lib/federazioni";
import { colonneTesseramento, federazioniPerAtleta } from "@/lib/tesseramento";
import { elencaNomiGruppiPerAtletaCorrenti } from "@/lib/nomi-gruppi-atleta";
import {
  calcolaIntervalloStagioneCorrente,
  trovaAnnoAgonisticoCorrente,
} from "@/lib/anno-agonistico";
import type { CertificatoExport } from "@/lib/export/certificati";
import { componiExportCompleto } from "@/lib/export/completo";
import { rifiutaExportNonAutorizzato } from "@/lib/export/autorizza-export";
import { generaXlsx, nomeFileExport, rispostaDownloadXlsx } from "@/lib/export-xlsx";

// Story 28.4 (Epic 28): download Excel complessivo, una riga per Atleta non
// rimossa - solo Admin (stessi Ruoli di /app/export-dati). Stesse letture
// degli export di sezione; il Tesseramento passa solo da lib/tesseramento.ts
// (vincolo Epic 26).
export const dynamic = "force-dynamic";

export async function GET() {
  const rifiuto = await rifiutaExportNonAutorizzato("/app/export-dati");
  if (rifiuto) return rifiuto;

  try {
    const oggi = new Date();
    const supabase = await createClient();
    const [atlete, certificati, annoCorrente, federazioni, gruppiPerAtleta] =
      await Promise.all([
        elencaAnagraficaAtleteExport(supabase),
        elencaCertificati(supabase),
        trovaAnnoAgonisticoCorrente(oggi),
        elencaFederazioni(),
        elencaNomiGruppiPerAtletaCorrenti(oggi),
      ]);
    // Come nelle pagine: senza Anno Agonistico corrente nessuna Atleta e'
    // iscritta ne' tesserata.
    const [iscrizioni, tesseramenti] = annoCorrente
      ? await Promise.all([
          elencaIscrizioniPerAnno(supabase, annoCorrente.id),
          federazioniPerAtleta(annoCorrente.id),
        ])
      : [[], new Map<string, string[]>()];

    const foglio = componiExportCompleto(
      {
        atlete,
        certificati: certificati as CertificatoExport[],
        iscrizioni,
        tesseramenti,
        colonneFederazioni: colonneTesseramento(federazioni, tesseramenti),
        gruppiPerAtleta,
      },
      oggi
    );
    const annoInizio = calcolaIntervalloStagioneCorrente(oggi).dataInizio.getUTCFullYear();

    return rispostaDownloadXlsx(
      generaXlsx(foglio),
      nomeFileExport("export-completo", annoInizio)
    );
  } catch (err) {
    console.error(err);
    return new Response("Export non riuscito, riprova.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaCertificati } from "@/lib/db-rls/certificato-medico";
import { elencaNomiGruppiPerAtletaCorrenti } from "@/lib/nomi-gruppi-atleta";
import { calcolaIntervalloStagioneCorrente } from "@/lib/anno-agonistico";
import { componiExportCertificati, type CertificatoExport } from "@/lib/export/certificati";
import { rifiutaExportNonAutorizzato } from "@/lib/export/autorizza-export";
import { generaXlsx, nomeFileExport, rispostaDownloadXlsx } from "@/lib/export-xlsx";

// Story 28.1 (Epic 28): download Excel dei Certificati di tutte le Atlete
// non rimosse - stessi dati e stessi Ruoli di /app/conferma-certificati.
export const dynamic = "force-dynamic";

export async function GET() {
  const rifiuto = await rifiutaExportNonAutorizzato("/app/conferma-certificati");
  if (rifiuto) return rifiuto;

  try {
    const oggi = new Date();
    const supabase = await createClient();
    const [atlete, certificati, gruppiPerAtleta] = await Promise.all([
      elencaAtlete(supabase),
      elencaCertificati(supabase),
      elencaNomiGruppiPerAtletaCorrenti(oggi),
    ]);

    const foglio = componiExportCertificati(
      atlete,
      certificati as CertificatoExport[],
      gruppiPerAtleta,
      oggi
    );
    const annoInizio = calcolaIntervalloStagioneCorrente(oggi).dataInizio.getUTCFullYear();

    return rispostaDownloadXlsx(
      generaXlsx(foglio),
      nomeFileExport("certificati", annoInizio)
    );
  } catch (err) {
    console.error(err);
    return new Response("Export non riuscito, riprova.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

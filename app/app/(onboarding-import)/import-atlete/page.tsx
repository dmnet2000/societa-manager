import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { ImportAtleteForm } from "./ImportAtleteForm";

// Story 17.2: pagina convertita da interamente "use client" a Server
// Component - serve per risolvere i Ruoli lato server e mostrare l'aiuto
// contestuale, stesso principio gia' in uso ovunque nel progetto. La
// logica interattiva del form resta invariata in ImportAtleteForm.tsx.
// force-dynamic esplicito per coerenza con le altre pagine che leggono
// ruoli/user (es. /admin, /gruppi) - la lettura di cookies() la rende
// comunque dinamica di per se', ma qui documentiamo l'intento invece di
// affidarci solo all'inferenza implicita di Next.js.
export const dynamic = "force-dynamic";

export default async function ImportAtletePage() {
  const ruoli = await risolviRuoliPerAiutoContestuale();

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Import archivio Atlete"
          contenuto={contenutoPerRotta("/app/import-atlete", ruoli)}
        />
        <ImportAtleteForm />
      </div>
    </main>
  );
}

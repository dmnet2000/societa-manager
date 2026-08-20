import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PaginaPubblicaEditor } from "../PaginaPubblicaEditor";

// Story 19.10: editor a canvas pieno (non inline come le righe di
// /app/menu-pubblico - un editor rich-text non ci sta in una card), rotta
// separata /app/pagine-pubbliche/nuova. route-guard.ts copre questa
// sotto-rotta con lo stesso prefisso di /app/pagine-pubbliche (startsWith),
// nessuna voce separata necessaria.
export default async function NuovaPaginaPubblicaPage() {
  const ruoli = await risolviRuoliPerAiutoContestuale();

  return (
    <main>
      <TitoloPagina
        titolo="Nuova pagina"
        contenuto={contenutoPerRotta("/app/pagine-pubbliche", ruoli)}
      />
      <PaginaPubblicaEditor modalita="crea" />
    </main>
  );
}

import { notFound } from "next/navigation";
import { trovaPaginaPubblicaPerId } from "@/lib/pagine-pubbliche";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PaginaPubblicaEditor } from "../PaginaPubblicaEditor";

// Dati potenzialmente diversi ad ogni visita (un'altra sessione potrebbe
// aver modificato/eliminato la Pagina nel frattempo) - stesso motivo di
// /app/pagine-pubbliche.
export const dynamic = "force-dynamic";

export default async function ModificaPaginaPubblicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ruoli, pagina] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaPaginaPubblicaPerId(id),
  ]);

  // Un id inesistente/gia' eliminato (link obsoleto, doppia scheda con
  // un'eliminazione nel frattempo) - 404 di oggi, stesso comportamento di
  // ogni altra pagina di dettaglio del progetto raggiunta per id.
  if (!pagina) {
    notFound();
  }

  return (
    <main>
      <TitoloPagina
        titolo={`Modifica: ${pagina.titolo}`}
        contenuto={contenutoPerRotta("/app/pagine-pubbliche", ruoli)}
      />
      <PaginaPubblicaEditor modalita="modifica" pagina={pagina} />
    </main>
  );
}

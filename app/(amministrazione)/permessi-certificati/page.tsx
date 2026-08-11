import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { PermessiCertificatiForm } from "./PermessiCertificatiForm";

// Dati mutabili in tempo reale (Server Action sulla stessa pagina) - stesso
// motivo di admin/page.tsx e vista-dirigente/page.tsx.
export const dynamic = "force-dynamic";

export default async function PermessiCertificatiPage() {
  // Story 17.2 (review fix): ruoli e annoCorrente non dipendono l'uno
  // dall'altro - eseguiti in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto. Sola lettura (Dev Notes Story 1.6): mai
  // risolviAnnoAgonisticoCorrente in una pagina GET.
  const [ruoli, annoCorrente] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
  ]);

  if (!annoCorrente) {
    return (
      <main className="pagina-form">
        <div className="riquadro-form">
          <TitoloPagina
            titolo="Permessi certificati"
            contenuto={contenutoPerRotta("/permessi-certificati", ruoli)}
          />
          <p>Nessun Anno Agonistico corrente — nessun Gruppo puo&apos; esistere ancora.</p>
        </div>
      </main>
    );
  }

  // Gruppo/GruppoVisibileDirigente non protette da RLS (AD-9) - Prisma
  // diretto, stesso pattern di ogni pagina Amministrazione precedente.
  const [gruppi, righeVisibili] = await Promise.all([
    prisma.gruppo.findMany({
      where: { annoAgonisticoId: annoCorrente.id },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, categoria: true },
    }),
    prisma.gruppoVisibileDirigente.findMany({ select: { gruppoId: true } }),
  ]);

  if (gruppi.length === 0) {
    return (
      <main className="pagina-form">
        <div className="riquadro-form">
          <TitoloPagina
            titolo="Permessi certificati"
            contenuto={contenutoPerRotta("/permessi-certificati", ruoli)}
          />
          <p>Nessun Gruppo creato per l&apos;Anno Agonistico corrente.</p>
        </div>
      </main>
    );
  }

  const gruppoIdsVisibili = righeVisibili.map((r) => r.gruppoId);

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Permessi certificati"
          contenuto={contenutoPerRotta("/permessi-certificati", ruoli)}
        />
        <PermessiCertificatiForm gruppi={gruppi} gruppoIdsVisibili={gruppoIdsVisibili} />
      </div>
    </main>
  );
}

import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { PermessiCertificatiForm } from "./PermessiCertificatiForm";

// Dati mutabili in tempo reale (Server Action sulla stessa pagina) - stesso
// motivo di admin/page.tsx e vista-dirigente/page.tsx.
export const dynamic = "force-dynamic";

export default async function PermessiCertificatiPage() {
  // Sola lettura (Dev Notes Story 1.6): mai risolviAnnoAgonisticoCorrente in
  // una pagina GET.
  const annoCorrente = await trovaAnnoAgonisticoCorrente();

  if (!annoCorrente) {
    return (
      <main>
        <h1>Permessi certificati</h1>
        <p>Nessun Anno Agonistico corrente — nessun Gruppo puo&apos; esistere ancora.</p>
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
      <main>
        <h1>Permessi certificati</h1>
        <p>Nessun Gruppo creato per l&apos;Anno Agonistico corrente.</p>
      </main>
    );
  }

  const gruppoIdsVisibili = righeVisibili.map((r) => r.gruppoId);

  return (
    <main>
      <h1>Permessi certificati</h1>
      <PermessiCertificatiForm gruppi={gruppi} gruppoIdsVisibili={gruppoIdsVisibili} />
    </main>
  );
}

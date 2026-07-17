import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { NuovoGruppoForm } from "./NuovoGruppoForm";
import { GruppoRow } from "./GruppoRow";

// Dati mutabili in tempo reale (creazione Gruppo/assegnazione Allenatori
// tramite Server Action sulla stessa pagina) - stesso motivo di /admin e
// /palestre (Story 1.2, 2.1).
export const dynamic = "force-dynamic";

export default async function GruppiPage() {
  // L'elenco va scoped all'Anno Agonistico corrente (AD-8, review fix
  // Story 2.2) - senza questo filtro, non appena esiste piu' di una
  // stagione l'elenco mescolerebbe Gruppi di anni diversi. Sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET, vedi Dev Notes Story 1.6) - se l'Anno Agonistico corrente
  // non esiste ancora, nessun Gruppo puo' comunque esistere per
  // definizione (creaGruppo lo risolve/crea sempre per primo), quindi
  // l'elenco resta semplicemente vuoto.
  const annoCorrente = await trovaAnnoAgonisticoCorrente();
  // Gruppo/Allenatore/GruppoAllenatore non sono protetti da RLS (AD-9):
  // gestibili via Prisma diretto, come Palestra/Campo (Story 2.1). Scala
  // ridotta (poche decine di Gruppi/Allenatori al massimo per una
  // polisportiva) - nessuna paginazione necessaria.
  const [gruppi, allenatori] = await Promise.all([
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
          include: {
            allenatori: {
              include: { allenatore: true },
              orderBy: { allenatore: { nome: "asc" } },
            },
          },
        })
      : Promise.resolve([]),
    prisma.allenatore.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <main>
      <h1>Gruppi</h1>

      <section>
        <h2>Nuovo Gruppo</h2>
        <NuovoGruppoForm />
      </section>

      <section>
        <h2>Elenco Gruppi</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Allenatori</th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map((gruppo) => (
              <GruppoRow
                key={gruppo.id}
                gruppo={{
                  id: gruppo.id,
                  nome: gruppo.nome,
                  categoria: gruppo.categoria,
                  allenatori: gruppo.allenatori.map((ga) => ga.allenatore),
                }}
                allenatoriDisponibili={allenatori}
              />
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

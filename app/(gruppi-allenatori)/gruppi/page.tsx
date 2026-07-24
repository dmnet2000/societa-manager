import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { NuovoGruppoForm } from "./NuovoGruppoForm";
import { GruppoRow } from "./GruppoRow";
import styles from "./gruppi.module.css";

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
  const supabase = await createClient();
  // Gruppo/Allenatore/GruppoAllenatore/GruppoAtleta non sono protetti da RLS
  // (AD-9): gestibili via Prisma diretto, come Palestra/Campo (Story 2.1).
  // Scala ridotta (poche decine di Gruppi/Allenatori, ~200 Atlete al
  // massimo per una polisportiva) - nessuna paginazione necessaria.
  // Atleta e' invece protetta da RLS (AD-4) - letta SOLO tramite
  // elencaAtlete(supabase) (client Supabase autenticato), mai con un
  // include Prisma su GruppoAtleta.atleta, che bypasserebbe le policy RLS
  // usando la connessione privilegiata di Prisma (vedi Dev Notes Story 2.4).
  const [gruppi, allenatori, atlete, gruppoAtleteRows] = await Promise.all([
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
    elencaAtlete(supabase),
    annoCorrente
      ? prisma.gruppoAtleta.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          select: { atletaId: true, gruppoId: true },
        })
      : Promise.resolve([]),
  ]);

  // Mappa costruita lato server per abbinare le Atlete (lette via RLS) alle
  // righe GruppoAtleta (lette via Prisma diretto) senza mai attraversare la
  // relazione con un include - vedi commento sopra. Proiettata a {id, nome}
  // (review fix): elencaAtlete espone anche codiceFiscale/categoria, dati
  // sensibili non necessari a questa pagina - il payload RSC verso il
  // client non deve portare piu' dati di quelli che il <select> usa.
  const atleteMinime = atlete.map(({ id, nome }) => ({ id, nome }));
  const atletaPerId = new Map(atleteMinime.map((atleta) => [atleta.id, atleta]));

  return (
    <main>
      <h1>Gruppi</h1>

      <section className={styles.sezione}>
        <h2>Nuovo Gruppo</h2>
        <NuovoGruppoForm />
      </section>

      <section className={styles.sezione}>
        <h2>Elenco Gruppi</h2>
        <div className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Allenatori</th>
                <th>Atlete</th>
              </tr>
            </thead>
            <tbody>
              {gruppi.map((gruppo) => {
                const atleteGruppo = gruppoAtleteRows
                  .filter((riga) => riga.gruppoId === gruppo.id)
                  .map((riga) => atletaPerId.get(riga.atletaId))
                  .filter((atleta): atleta is { id: string; nome: string } => atleta !== undefined)
                  .sort((a, b) => a.nome.localeCompare(b.nome));

                return (
                  <GruppoRow
                    key={gruppo.id}
                    gruppo={{
                      id: gruppo.id,
                      nome: gruppo.nome,
                      categoria: gruppo.categoria,
                      allenatori: gruppo.allenatori.map((ga) => ga.allenatore),
                      atlete: atleteGruppo,
                    }}
                    allenatoriDisponibili={allenatori}
                    atleteDisponibili={atleteMinime}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

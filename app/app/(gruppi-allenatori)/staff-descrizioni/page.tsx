import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { DescrizioneStaffForm } from "./DescrizioneStaffForm";
import styles from "../gruppi/gruppi.module.css";

// Story 19.12 (Epic 19, Ruolo Site Manager): vista scoped
// SITE_MANAGER+ADMIN+DIRIGENTE, mirror strutturale di foto-squadre/page.tsx
// (Story 19.4) - stesso principio di scope, ma qui l'unica azione ammessa e'
// il salvataggio di Allenatore.descrizione/ruoliAggiuntivi (mostrati poi su
// /staff, sito pubblico), non il controllo foto. Dati mutabili in tempo
// reale (salvataggio tramite Server Action sulla stessa pagina) - stesso
// motivo di /app/foto-squadre.
export const dynamic = "force-dynamic";

export default async function StaffDescrizioniPage() {
  const [ruoli, annoCorrente] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
  ]);

  // Allenatore non e' protetto da RLS (AD-9): Prisma diretto, stesso pattern
  // di foto-squadre/page.tsx. Stesso filtro "assegnato a un Gruppo nella
  // stagione corrente" di app/staff/page.tsx (Boundaries & Constraints della
  // spec: un Allenatore fuori da questo filtro non e' gestibile da questa
  // pagina, nessun Gruppo a cui associare visivamente la modifica).
  const allenatori = annoCorrente
    ? await prisma.allenatore.findMany({
        where: {
          gruppi: { some: { gruppo: { annoAgonisticoId: annoCorrente.id } } },
        },
        orderBy: [{ nome: "asc" }, { cognome: "asc" }],
        select: {
          id: true,
          nome: true,
          cognome: true,
          descrizione: true,
          ruoliAggiuntivi: true,
          gruppi: {
            where: { gruppo: { annoAgonisticoId: annoCorrente.id } },
            select: { gruppo: { select: { id: true, nome: true } } },
            orderBy: { gruppo: { nome: "asc" } },
          },
        },
      })
    : [];

  return (
    <main>
      <TitoloPagina
        titolo="Staff"
        contenuto={contenutoPerRotta("/app/staff-descrizioni", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Elenco Allenatori</h2>
        <div className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Gruppi</th>
                <th>Descrizione e ruoli aggiuntivi</th>
              </tr>
            </thead>
            <tbody>
              {allenatori.map((allenatore) => (
                <tr key={allenatore.id}>
                  <td>
                    {allenatore.nome} {allenatore.cognome}
                  </td>
                  <td>
                    <ul className={styles.listaAssegnatiInline}>
                      {allenatore.gruppi.map(({ gruppo }) => (
                        <li key={gruppo.id}>{gruppo.nome}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <DescrizioneStaffForm
                      allenatoreId={allenatore.id}
                      allenatoreNome={`${allenatore.nome} ${allenatore.cognome}`}
                      descrizioneIniziale={allenatore.descrizione}
                      ruoliAggiuntiviIniziali={allenatore.ruoliAggiuntivi}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

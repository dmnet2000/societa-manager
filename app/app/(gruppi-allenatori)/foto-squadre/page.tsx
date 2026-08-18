import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaGruppiConFoto, urlPubblicoFotoSquadra } from "@/lib/storage/foto-squadra";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { FotoSquadraForm } from "../gruppi/FotoSquadraForm";
import styles from "../gruppi/gruppi.module.css";

// Story 19.4 (Epic 19, Ruolo Site Manager): vista scoped SITE_MANAGER-only,
// mirror snello di gruppi/page.tsx (Admin/Dirigente) - stesso principio di
// scope gia' seguito da i-miei-gruppi/page.tsx (Allenatore), ma qui senza
// nessuna delle query di dominio di quella pagina (niente atlete/
// certificati/iscrizioni/tesseramenti): l'unica azione ammessa e' il
// controllo foto squadra, riusato identico da FotoSquadraForm.tsx (gia'
// condiviso tra GruppoRow.tsx e MioGruppoCard.tsx). Dati mutabili in tempo
// reale (upload foto tramite Server Action sulla stessa pagina) - stesso
// motivo di /app/gruppi.
export const dynamic = "force-dynamic";

export default async function FotoSquadrePage() {
  const [ruoli, annoCorrente, supabase] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
    createClient(),
  ]);

  // Gruppo non e' protetto da RLS (AD-9): Prisma diretto, stesso pattern di
  // gruppi/page.tsx. A differenza di quella pagina, nessun include
  // "allenatori" - questa vista non mostra ne' modifica gli Allenatori
  // assegnati.
  const [gruppi, gruppiConFoto] = await Promise.all([
    annoCorrente
      ? prisma.gruppo.findMany({
          where: { annoAgonisticoId: annoCorrente.id },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    // Story 18.4: UNA sola chiamata Storage per l'intero elenco Gruppi, non
    // una per Gruppo - stesso riuso di gruppi/page.tsx.
    elencaGruppiConFoto(supabase),
  ]);

  return (
    <main>
      <TitoloPagina
        titolo="Foto squadre"
        contenuto={contenutoPerRotta("/app/foto-squadre", ruoli)}
      />

      <section className={styles.sezione}>
        <h2>Elenco Gruppi</h2>
        <div className={styles.scrollWrapper}>
          <table className={styles.tabella}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Foto squadra</th>
              </tr>
            </thead>
            <tbody>
              {gruppi.map((gruppo) => {
                const fotoAggiornataIl = gruppiConFoto.get(gruppo.id) ?? null;

                return (
                  <tr key={gruppo.id}>
                    <td>{gruppo.nome}</td>
                    <td>{gruppo.categoria}</td>
                    <td>
                      <FotoSquadraForm
                        gruppoId={gruppo.id}
                        gruppoNome={gruppo.nome}
                        fotoEsiste={gruppiConFoto.has(gruppo.id)}
                        fotoUrl={urlPubblicoFotoSquadra(supabase, gruppo.id)}
                        fotoAggiornataIl={fotoAggiornataIl}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

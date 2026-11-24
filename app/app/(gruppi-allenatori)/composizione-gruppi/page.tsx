import { prisma } from "@/lib/prisma";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import { createClient } from "@/lib/supabase/server";
import { elencaAtlete } from "@/lib/db-rls/atleta";
import { elencaIscrizioniPerAnno } from "@/lib/db-rls/iscrizione";
import { etichetteTesseramentoPerAtleta } from "@/lib/tesseramento";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { componiGruppi } from "./componi-gruppi";
import styles from "./composizione-gruppi.module.css";

export const dynamic = "force-dynamic";

// Ruolo Direttore Tecnico: composizione di tutti i Gruppi della stagione
// corrente con stato Iscrizione/Tesseramento, in sola lettura (nessuna
// Server Action). Accesso ADMIN/DIRETTORE_TECNICO garantito dal route guard;
// i ruoli letti qui servono solo all'aiuto contestuale (cosmetico, mirror
// di vista-dirigente/page.tsx) - la pagina e' identica per entrambi.
export default async function ComposizioneGruppiPage() {
  const [ruoli, annoCorrente] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    trovaAnnoAgonisticoCorrente(),
  ]);
  const titolo = (
    <TitoloPagina
      titolo="Composizione gruppi"
      contenuto={contenutoPerRotta("/app/composizione-gruppi", ruoli)}
    />
  );

  if (!annoCorrente) {
    return (
      <main>
        {titolo}
        <p>Nessun Anno Agonistico corrente — nessun Gruppo può esistere ancora.</p>
      </main>
    );
  }

  // Gruppo/GruppoAtleta via Prisma diretto (AD-9), Atleta/Iscrizione via
  // client Supabase autenticato (RLS, AD-4), Tesseramento solo tramite
  // lib/tesseramento.ts - stesso schema di lettura di gruppi/page.tsx.
  const supabase = await createClient();
  const [gruppi, righeGruppoAtleta, atlete, iscrizioni, federazioniPerAtleta] =
    await Promise.all([
      prisma.gruppo.findMany({
        where: { annoAgonisticoId: annoCorrente.id },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, categoria: true },
      }),
      prisma.gruppoAtleta.findMany({
        where: { annoAgonisticoId: annoCorrente.id },
        select: { atletaId: true, gruppoId: true },
      }),
      elencaAtlete(supabase),
      elencaIscrizioniPerAnno(supabase, annoCorrente.id),
      etichetteTesseramentoPerAtleta(annoCorrente.id),
    ]);

  const composizione = componiGruppi(
    gruppi,
    righeGruppoAtleta,
    atlete.map(({ id, nome }) => ({ id, nome })),
    new Set(iscrizioni.map((i) => i.atletaId)),
    federazioniPerAtleta
  );

  return (
    <main>
      {titolo}
      {composizione.length === 0 ? (
        <p>Nessun Gruppo creato per l&apos;Anno Agonistico corrente.</p>
      ) : (
        <div className={styles.lista}>
          {composizione.map((gruppo) => (
            <section key={gruppo.id} className={styles.card} aria-labelledby={`gruppo-${gruppo.id}`}>
              <div className={styles.cardHeader}>
                <h2 id={`gruppo-${gruppo.id}`} className={styles.nomeGruppo}>
                  {gruppo.nome}
                </h2>
                <span className={styles.categoria}>{gruppo.categoria}</span>
              </div>
              <p className={styles.riepilogo}>
                {gruppo.atlete.length} {gruppo.atlete.length === 1 ? "atleta" : "atlete"} ·{" "}
                {gruppo.numeroIscritte} {gruppo.numeroIscritte === 1 ? "iscritta" : "iscritte"} ·{" "}
                {gruppo.numeroTesserate} {gruppo.numeroTesserate === 1 ? "tesserata" : "tesserate"}
              </p>
              {gruppo.atlete.length === 0 ? (
                <p className={styles.messaggioVuoto}>Nessuna atleta assegnata.</p>
              ) : (
                <ul className={styles.elencoAtlete}>
                  {gruppo.atlete.map((atleta) => (
                    <li key={atleta.id} className={styles.rigaAtleta}>
                      <span className={styles.nomeAtleta}>{atleta.nome}</span>
                      <span className={styles.badges}>
                        {atleta.iscritta ? (
                          <span className={styles.badgeSuccesso}>Iscritta</span>
                        ) : (
                          <span className={styles.badgeDanger}>Non iscritta</span>
                        )}
                        {atleta.federazioni.length > 0 ? (
                          <span className={styles.badgeSuccesso}>
                            Tesserata · {atleta.federazioni.join(", ")}
                          </span>
                        ) : (
                          <span className={styles.badgeDanger}>Non tesserata</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

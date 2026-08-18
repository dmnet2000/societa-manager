import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { raggruppaSponsorPerTipo } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { NuovoSponsorForm } from "./NuovoSponsorForm";
import { SponsorRow } from "./SponsorRow";
import { SponsorVetrinaCard } from "./SponsorVetrinaCard";
import styles from "./sponsor.module.css";

// Dati mutabili in tempo reale (creazione/modifica/toggle Sponsor tramite
// Server Action sulla stessa pagina) - stesso motivo di /palestre (Story 2.1).
export const dynamic = "force-dynamic";

export default async function SponsorPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  // Story 16.2: prima rotta del progetto visibile a tutti i Ruoli - stesso
  // principio di /campionati (contenuto condizionale per Ruolo sulla stessa
  // pagina, non una rotta distinta).
  const ruoli = parseRuoli(user?.app_metadata?.ruoli);
  // Story 19.3 (Epic 19, Ruolo Site Manager): SITE_MANAGER vede anche il
  // pannello di gestione - terzo gate distinto, separato dalla rotta
  // (route-guard.ts) e dalle Server Action (actions.ts).
  const eGestionale =
    ruoli.includes("ADMIN") || ruoli.includes("DIRIGENTE") || ruoli.includes("SITE_MANAGER");

  // Vetrina (AC #1): visibile a TUTTI i Ruoli, solo Sponsor attivi. Sponsor
  // non e' protetto da RLS (AD-9) - Prisma diretto, come Palestra.
  const sponsorAttivi = await prisma.sponsor.findMany({
    where: { attiva: true },
    orderBy: { createdAt: "desc" },
  });
  const { banner, convenzioni } = raggruppaSponsorPerTipo(
    sponsorAttivi.map((s) => ({
      id: s.id,
      nome: s.nome,
      tipo: s.tipo,
      descrizione: s.descrizione,
      updatedAt: s.updatedAt.toISOString(),
      linkEsterno: s.linkEsterno,
    }))
  );
  const nessunoSponsorAttivo = banner.length === 0 && convenzioni.length === 0;

  // Gestione (Story 16.1): solo Admin/Dirigente, elenco completo (attivi e
  // disattivati) - a differenza della vetrina sopra.
  const sponsorGestione = eGestionale
    ? await prisma.sponsor.findMany({ orderBy: { createdAt: "desc" } })
    : [];

  return (
    <main>
      <TitoloPagina titolo="Sponsor" contenuto={contenutoPerRotta("/app/sponsor", ruoli)} />

      <section className={styles.sezione}>
        <h2>Sponsor e Convenzioni</h2>
        {nessunoSponsorAttivo ? (
          <p className={styles.messaggioVuoto}>Nessuno sponsor al momento.</p>
        ) : (
          <>
            {banner.length > 0 && (
              <div className={styles.gruppoVetrina}>
                <h3 className={styles.titoloGruppoVetrina}>Banner pubblicitari</h3>
                <div className={styles.listaVetrina}>
                  {banner.map((sponsor) => (
                    <SponsorVetrinaCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      immagineUrl={urlPubblicoImmagineSponsor(supabase, sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {convenzioni.length > 0 && (
              <div className={styles.gruppoVetrina}>
                <h3 className={styles.titoloGruppoVetrina}>Convenzioni</h3>
                <div className={styles.listaVetrina}>
                  {convenzioni.map((sponsor) => (
                    <SponsorVetrinaCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      immagineUrl={urlPubblicoImmagineSponsor(supabase, sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {eGestionale && (
        <>
          <section className={styles.sezione}>
            <h2>Nuovo Sponsor</h2>
            <NuovoSponsorForm />
          </section>

          <section className={styles.sezione}>
            <h2>Elenco Sponsor (gestione)</h2>
            {sponsorGestione.length === 0 ? (
              <p className={styles.messaggioVuoto}>Nessuno Sponsor ancora creato.</p>
            ) : (
              <div className={styles.lista}>
                {sponsorGestione.map((sponsor) => (
                  <SponsorRow
                    key={sponsor.id}
                    sponsor={{
                      id: sponsor.id,
                      nome: sponsor.nome,
                      tipo: sponsor.tipo,
                      descrizione: sponsor.descrizione,
                      linkEsterno: sponsor.linkEsterno,
                      attiva: sponsor.attiva,
                      updatedAt: sponsor.updatedAt.toISOString(),
                      immagineUrl: urlPubblicoImmagineSponsor(supabase, sponsor.id),
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { raggruppaSponsorPerTipo } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import { SponsorPubblicoCard } from "./SponsorPubblicoCard";
import styles from "./sponsor-pubblico.module.css";

// Story 16.5: pagina pubblica dedicata, sostituisce la sezione statica
// "I nostri sponsor"/"Convenzioni" rimossa da "/" (Story 18.2, ora ridondante
// con il banner sponsor rotante fisso di Story 16.4, visibile su ogni pagina
// pubblica incluso qui). Mirror strutturale di /squadre e /calendario
// (Story 18.8 in poi): Header/Footer pubblici, un <h1>, dynamic
// "force-dynamic" - stesso motivo gia' documentato in app/page.tsx per gli
// Sponsor (Admin puo' attivare/disattivare/modificare uno Sponsor in
// qualunque momento dalla console di gestione).
export const dynamic = "force-dynamic";

export default async function SponsorPubblicoPage() {
  // Nessuna sessione qui (pagina pubblica) - stesso principio di "/" e delle
  // altre pagine pubbliche sorelle.
  const supabase = await createClient();

  // Story 16.5: stessa identica query Sponsor gia' in uso in "/" (Story
  // 18.2, con lo stesso "select" esplicito da quel review fix), spostata qui
  // tale e quale - Sponsor non e' protetto da RLS (AD-9), Prisma diretto.
  const sponsorAttivi = await prisma.sponsor
    .findMany({
      where: { attiva: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        tipo: true,
        descrizione: true,
        updatedAt: true,
        linkEsterno: true,
      },
    })
    .catch((err) => {
      console.error(err);
      return [];
    });

  // Story 16.5: riuso diretto della stessa funzione pura gia' usata da "/"
  // (rimossa da li' in questa stessa story) e da /app/sponsor (Story 16.2) -
  // nessuna duplicazione della logica di raggruppamento.
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
  const mostraSponsor = banner.length > 0 || convenzioni.length > 0;

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>Sponsor</h1>
        {/* AC #3: messaggio esplicito invece di un'area vuota quando non ci
            sono Sponsor attivi (ne' Banner ne' Convenzioni) - stessa
            etichetta gia' usata in /app/sponsor (Story 16.2 AC #4). Qui
            l'intera pagina esiste solo per questo contenuto (a differenza
            della sezione opzionale che era in home, che semplicemente
            spariva). */}
        {mostraSponsor ? (
          <section className={styles.sezioneSponsor} aria-label="Sponsor">
            {banner.length > 0 && (
              <div className={styles.gruppoSponsor}>
                <h2 className={styles.titoloSponsor}>I nostri sponsor</h2>
                <div className={styles.listaSponsor}>
                  {banner.map((sponsor) => (
                    <SponsorPubblicoCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      immagineUrl={urlPubblicoImmagineSponsor(supabase, sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {convenzioni.length > 0 && (
              <div className={styles.gruppoSponsor}>
                <h2 className={styles.titoloSponsor}>Convenzioni</h2>
                <div className={styles.listaSponsor}>
                  {convenzioni.map((sponsor) => (
                    <SponsorPubblicoCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      immagineUrl={urlPubblicoImmagineSponsor(supabase, sponsor.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <p className={styles.messaggioVuoto}>Nessuno sponsor al momento.</p>
        )}
      </main>
      <FooterPubblico />
    </>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { raggruppaSponsorPerTipo } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import { SponsorPubblicoCard } from "./SponsorPubblicoCard";
import styles from "./home-pubblica.module.css";

// Story 18.1 (Epic 18): nuova home pubblica su "/" (senza autenticazione),
// sostituisce la dashboard interna spostata su /app - vedi app/app/page.tsx.
// Solo layout/scheletro in Story 18.1 (AC #7); Story 18.2 aggiunge la prima
// sezione di contenuto (Sponsor). Logo/nome del settore/Sponsor possono
// cambiare in qualunque momento dalla console Admin - stesso motivo di
// dynamic = "force-dynamic" gia' in uso su /accedi.
export const dynamic = "force-dynamic";

export default async function HomePubblicaPage() {
  // Nessuna sessione qui (pagina pubblica): createClient() funziona
  // comunque (usa la sola anon key). Review fix (Blind Hunter, Story 18.1):
  // le tre letture non dipendono l'una dall'altra - eseguite in Promise.all,
  // stesso principio gia' stabilito in impostazioni/page.tsx (Story 17.2
  // review fix). Pagina raggiungibile da qualunque visitatore anonimo, non
  // solo da Staff interno come la vecchia dashboard - la latenza extra di
  // letture in sequenza la pagherebbe il pubblico. .catch() inline per
  // restare dentro il Promise.all senza perdere il comportamento fail-soft
  // (un errore transitorio su una non nasconde le altre).
  const supabase = await createClient();

  const [info, nomeSettore, sponsorAttivi] = await Promise.all([
    leggiInfoLogo(supabase).catch((err) => {
      console.error(err);
      return { esiste: false, aggiornatoIl: null as string | null };
    }),
    leggiNomeSettore().catch((err) => {
      console.error(err);
      return null;
    }),
    // Story 18.2 (AC #1/#2/#3): stessa query di app/app/(sponsor)/sponsor/page.tsx
    // (Sponsor non protetto da RLS, AD-9, Prisma diretto) - solo Sponsor
    // attivi. Review fix (Blind Hunter): "select" esplicito - il confine
    // "cosa e' sicuro esporre a un Visitatore anonimo" e' imposto dalla
    // query stessa, non solo dalla disciplina del .map() sotto (un futuro
    // campo interno aggiunto al model Sponsor non arriverebbe qui senza
    // un cambio esplicito a questo select).
    prisma.sponsor
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
      }),
  ]);

  const nomeVisualizzato = nomeSettore ?? "Settore Volley";

  // Story 18.2: riuso diretto della stessa funzione pura gia' usata da
  // /app/sponsor (Story 16.2), nessuna duplicazione della logica di
  // raggruppamento.
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
      <header className={styles.header}>
        <div className={styles.brand}>
          {info.esiste && (
            <img
              className={styles.logo}
              src={`${urlPubblicoLogo(supabase)}?v=${encodeURIComponent(info.aggiornatoIl ?? "")}`}
              alt=""
            />
          )}
          <span className={styles.nomeSettore}>{nomeVisualizzato}</span>
        </div>
        <Link href="/accedi" className={styles.accedi}>
          Accedi
        </Link>
      </header>
      <main>
        <div className={styles.hero}>
          <h1>Benvenuti nel {nomeVisualizzato}</h1>
          {/* Review fix (Acceptance Auditor, Story 18.2): "i nostri sponsor"
              rimosso dall'elenco "in arrivo" - la sezione Sponsor appena
              sotto li mostra gia', lasciare la vecchia frase li avrebbe
              contraddetti nella stessa pagina. Stesso aggiornamento andra'
              ripetuto per partite/foto squadra/social man mano che le
              Story 18.3-18.5 le rendono live (nessun meccanismo automatico
              lo previene, e' testo statico). */}
          <p className={styles.sottotitolo}>
            Il sito pubblico del nostro settore volley è in costruzione: presto
            qui troverai le partite della settimana, le foto delle squadre e
            gli ultimi post dai nostri canali social.
          </p>
        </div>

        {/* Story 18.2 (AC #2): nessuna sezione se non ci sono Sponsor attivi
            (ne' Banner ne' Convenzioni) - stesso principio gia' applicato in
            Story 16.3 (carosello Banner) e nello scheletro di Story 18.1. */}
        {mostraSponsor && (
          // Review fix (Blind Hunter): aria-label esplicito - senza, la
          // sezione non ha un nome accessibile proprio (i due <h2> interni
          // non bastano) e non verrebbe esposta come landmark nominato.
          <section className={styles.sezioneSponsor} aria-label="Sponsor">

            {banner.length > 0 && (
              <div className={styles.gruppoSponsor}>
                <h2>I nostri sponsor</h2>
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
                <h2>Convenzioni</h2>
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
        )}
      </main>
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {nomeVisualizzato}
        </p>
      </footer>
    </>
  );
}

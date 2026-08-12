import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { raggruppaSponsorPerTipo } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import {
  lunediDellaSettimana,
  parseDataUtc,
  raggruppaPerSettimana,
} from "@/lib/raggruppa-per-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { NOME_COOKIE_CONSENSO, parseValoreConsenso } from "@/lib/cookie-consenso";
import { SponsorPubblicoCard } from "./SponsorPubblicoCard";
import { CookieBanner } from "./CookieBanner";
import styles from "./home-pubblica.module.css";

// Story 18.1 (Epic 18): nuova home pubblica su "/" (senza autenticazione),
// sostituisce la dashboard interna spostata su /app - vedi app/app/page.tsx.
// Solo layout/scheletro in Story 18.1 (AC #7); Story 18.2 aggiunge la prima
// sezione di contenuto (Sponsor); Story 18.3 la sezione Partite. Logo/nome
// del settore/Sponsor/Partite possono cambiare in qualunque momento -
// stesso motivo di dynamic = "force-dynamic" gia' in uso su /accedi.
export const dynamic = "force-dynamic";

// Story 18.3: mirror del wrapper locale gia' in uso in
// app/app/(partite-campionati)/partite/page.tsx - timeZone: "UTC" esplicito
// (senza, il fuso orario locale del processo potrebbe mostrare una data
// sfalsata di un giorno rispetto alla stringa "YYYY-MM-DD" originale).
// parseDataUtc riusata (gia' esportata), non un secondo parsing indipendente.
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

function formattaDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

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

  // Story 18.6: lettura del cookie di consenso - stesso identico pattern
  // (cookies() da next/headers) gia' in uso in lib/supabase/server.ts.
  // Nessuna dipendenza da Promise.all sopra: e' una lettura locale della
  // richiesta in corso, non una chiamata di rete/DB.
  const cookieStore = await cookies();
  const valoreConsensoIniziale = parseValoreConsenso(
    cookieStore.get(NOME_COOKIE_CONSENSO)?.value
  );

  // Story 18.3: confini lunedi'-domenica della sola settimana corrente
  // (convenzione italiana) - lunediDellaSettimana esportata da
  // lib/raggruppa-per-settimana.ts (Story 10.3) invece di duplicarne la
  // matematica (offset getUTCDay() non ovvio, gia' corretta e testata).
  const lunediCorrente = lunediDellaSettimana(new Date());
  const domenicaCorrente = new Date(
    lunediCorrente.getTime() + 6 * 24 * 60 * 60 * 1000
  );
  const lunediIso = formattaDataIso(lunediCorrente);
  const domenicaIso = formattaDataIso(domenicaCorrente);

  const [info, nomeSettore, sponsorAttivi, partiteSettimanaRaw] = await Promise.all([
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
    // Story 18.3 (AC #1/#2/#3): mirror del filtro/orderBy gia' in uso in
    // app/app/(partite-campionati)/partite/page.tsx, senza lo scoping per
    // Ruolo/Allenatore/Atleta (qui tutti i Gruppi, sempre) e senza
    // includere campionato (non richiesto dall'AC). "select" esplicito
    // (Sponsor, review fix Story 18.2) - il confine "cosa e' pubblico" e'
    // imposto dalla query, non solo dal mapping successivo.
    prisma.partita
      .findMany({
        where: { data: { gte: lunediIso, lte: domenicaIso } },
        orderBy: [{ data: "asc" }, { ora: "asc" }],
        select: {
          id: true,
          data: true,
          ora: true,
          squadraCasa: true,
          squadraOspite: true,
          impianto: true,
          indirizzoImpianto: true,
          gruppo: { select: { nome: true } },
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

  // Story 18.3: riuso di raggruppaPerSettimana (gia' esportata e testata,
  // Story 10.3) anche solo per UNA settimana - da' gratis l'ordinamento
  // corretto per orario (oraInMinuti, gestisce anche orari non
  // zero-paddati da un import Excel) invece di fidarsi del solo orderBy
  // Prisma (confronto stringa, non numerico) o duplicare quella logica.
  const [settimanaCorrente] = raggruppaPerSettimana(partiteSettimanaRaw);
  const partiteSettimana = settimanaCorrente?.partite ?? [];
  const mostraPartite = partiteSettimana.length > 0;

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
          {/* Review fix (Acceptance Auditor, Story 18.2) + Story 18.3: "i
              nostri sponsor" e "le partite della settimana" rimossi
              dall'elenco "in arrivo" man mano che le sezioni corrispondenti
              diventano live sotto - lasciare la vecchia frase avrebbe
              contraddetto la pagina stessa. Stesso aggiornamento andra'
              ripetuto per foto squadra/social quando le Story 18.4/18.5 le
              rendono live (nessun meccanismo automatico lo previene, e'
              testo statico). */}
          <p className={styles.sottotitolo}>
            Il sito pubblico del nostro settore volley è in costruzione: presto
            qui troverai le foto delle squadre e gli ultimi post dai nostri
            canali social.
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
                <h2 className={styles.titoloSezione}>I nostri sponsor</h2>
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
                <h2 className={styles.titoloSezione}>Convenzioni</h2>
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

        {/* Story 18.3 (AC #2): nessuna sezione se nessun Gruppo ha partite
            nella settimana corrente - stesso principio della sezione
            Sponsor sopra. */}
        {mostraPartite && (
          <section className={styles.sezionePartite} aria-label="Partite della settimana">
            <h2 className={styles.titoloSezione}>Partite della settimana</h2>
            {/* Card invece di tabella (indicazione utente 2026-08-12, vedi
                commento in home-pubblica.module.css sopra .listaPartite) -
                stessi campi di sola lettura della vecchia riga <tr>
                (Giorno/Ora/Squadre/Luogo/Gruppo), nessuna colonna
                "Azioni" (AC #3, nessun Ruolo puo' modificare da qui). */}
            <div className={styles.listaPartite}>
              {partiteSettimana.map((partita) => {
                const linkNaviga = costruisciLinkNaviga({
                  indirizzo: partita.indirizzoImpianto,
                });
                return (
                  <div className={styles.schedaPartita} key={partita.id}>
                    <div className={styles.dataPartita}>
                      <span>{formattaData(partita.data)}</span>
                      <span>{partita.ora}</span>
                    </div>
                    <div className={styles.squadrePartita}>
                      {partita.squadraCasa} - {partita.squadraOspite}
                    </div>
                    <div className={styles.luogoPartita}>
                      {partita.impianto}
                      {linkNaviga && (
                        <>
                          {" "}
                          <a
                            className={styles.linkNaviga}
                            href={linkNaviga}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Naviga verso ${partita.impianto ?? "il luogo della partita"}`}
                          >
                            Naviga
                          </a>
                        </>
                      )}
                    </div>
                    <span className={styles.gruppoPartita}>{partita.gruppo.nome}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {nomeVisualizzato}
        </p>
      </footer>
      {/* Story 18.6: sempre montato (non condizionato come
          mostraSponsor/mostraPartite sopra) - deve restare raggiungibile
          come pulsante "Preferenze cookie" anche dopo la scelta (AC #3),
          non solo alla prima visita. */}
      <CookieBanner valoreIniziale={valoreConsensoIniziale} />
    </>
  );
}

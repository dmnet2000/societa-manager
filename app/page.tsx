import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { trovaAnnoAgonisticoCorrente } from "@/lib/anno-agonistico";
import {
  leggiNomeSettore,
  leggiUrlPaginaFacebook,
} from "@/lib/configurazione-applicazione";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { raggruppaSponsorPerTipo } from "@/lib/sponsor/raggruppa-sponsor-per-tipo";
import {
  formattaDataIso,
  lunediDellaSettimana,
  parseDataUtc,
  raggruppaPerSettimana,
} from "@/lib/raggruppa-per-settimana";
import { costruisciLinkNaviga } from "@/lib/link-naviga-palestra";
import { elencaGruppiConFoto, urlPubblicoFotoSquadra } from "@/lib/storage/foto-squadra";
import { costruisciLinkPaginaFacebookIncorporata } from "@/lib/embed-facebook";
import {
  NOME_COOKIE_CONSENSO,
  haAccettatoCookieNonEssenziali,
  parseValoreConsenso,
} from "@/lib/cookie-consenso";
import { SponsorPubblicoCard } from "./SponsorPubblicoCard";
import { CookieBanner } from "./CookieBanner";
import { HeaderPubblico } from "./HeaderPubblico";
import { FooterPubblico } from "./FooterPubblico";
import styles from "./home-pubblica.module.css";

// Story 18.1 (Epic 18): nuova home pubblica su "/" (senza autenticazione),
// sostituisce la dashboard interna spostata su /app - vedi app/app/page.tsx.
// Solo layout/scheletro in Story 18.1 (AC #7); Story 18.2 aggiunge la prima
// sezione di contenuto (Sponsor), Story 18.3 la sezione Partite, Story 18.4
// la sezione Foto di squadra. Logo/nome del settore/Sponsor/Partite/Foto
// possono cambiare in qualunque momento - stesso motivo di
// dynamic = "force-dynamic" gia' in uso su /accedi.
export const dynamic = "force-dynamic";

// Story 18.3: mirror del wrapper locale gia' in uso in
// app/app/(partite-campionati)/partite/page.tsx - timeZone: "UTC" esplicito
// (senza, il fuso orario locale del processo potrebbe mostrare una data
// sfalsata di un giorno rispetto alla stringa "YYYY-MM-DD" originale).
// parseDataUtc riusata (gia' esportata), non un secondo parsing indipendente.
function formattaData(data: string): string {
  return parseDataUtc(data).toLocaleDateString("it-IT", { timeZone: "UTC" });
}

export default async function HomePubblicaPage() {
  // Nessuna sessione qui (pagina pubblica): createClient() funziona
  // comunque (usa la sola anon key). Review fix (Blind Hunter, Story 18.1):
  // le letture non dipendono l'una dall'altra - eseguite in Promise.all,
  // stesso principio gia' stabilito in impostazioni/page.tsx (Story 17.2
  // review fix). Pagina raggiungibile da qualunque visitatore anonimo, non
  // solo da Staff interno come la vecchia dashboard - la latenza extra di
  // letture in sequenza la pagherebbe il pubblico. .catch() inline per
  // restare dentro il Promise.all senza perdere il comportamento fail-soft
  // (un errore transitorio su una non nasconde le altre).
  //
  // Story 18.4: annoCorrente risolto qui (non nel Promise.all sotto) perche'
  // la query Gruppi/Foto la' dentro dipende dal suo id - sola lettura
  // (trovaAnnoAgonisticoCorrente, mai risolviAnnoAgonisticoCorrente in una
  // pagina GET, stesso vincolo di /app/gruppi). Ancora in parallelo con
  // createClient() (nessuna dipendenza reciproca tra le due).
  const [supabase, annoCorrente] = await Promise.all([
    createClient(),
    trovaAnnoAgonisticoCorrente(),
  ]);

  // Story 18.6: lettura del cookie di consenso - stesso identico pattern
  // (cookies() da next/headers) gia' in uso in lib/supabase/server.ts.
  // Nessuna dipendenza da Promise.all sopra: e' una lettura locale della
  // richiesta in corso, non una chiamata di rete/DB.
  const cookieStore = await cookies();
  const valoreCookieConsenso = cookieStore.get(NOME_COOKIE_CONSENSO)?.value;
  const valoreConsensoIniziale = parseValoreConsenso(valoreCookieConsenso);
  // Story 18.5 (AC #4): unico controllo da riusare per decidere se caricare
  // uno strumento non essenziale (embed Facebook) - scritto apposta in
  // Story 18.6 per questa storia, non ri-derivato confrontando di nuovo la
  // stringa "accettato".
  const consentitoSocial = haAccettatoCookieNonEssenziali(valoreCookieConsenso);

  // Story 18.3: confini lunedi'-domenica della sola settimana corrente
  // (convenzione italiana) - lunediDellaSettimana esportata da
  // lib/raggruppa-per-settimana.ts (Story 10.3) invece di duplicarne la
  // matematica (offset getUTCDay() non ovvio, gia' corretta e testata).
  // Review fix: "oggi" calcolato sul calendario di Europe/Rome, non
  // sull'istante UTC di new Date() - stesso identico problema e stessa
  // soluzione gia' note nel progetto (certificato-scaduto.ts, Story 4.5
  // review fix): per 1-2 ore ogni lunedi' (a cavallo della mezzanotte
  // italiana, CET/CEST) l'istante UTC e' ancora domenica, e getUTCDay()
  // su new Date() calcolerebbe il lunedi' della settimana PRECEDENTE
  // proprio nella finestra in cui un visitatore vorrebbe vedere quella
  // corrente.
  const oggiIsoItalia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(new Date());
  const lunediCorrente = lunediDellaSettimana(parseDataUtc(oggiIsoItalia));
  const domenicaCorrente = new Date(
    lunediCorrente.getTime() + 6 * 24 * 60 * 60 * 1000
  );
  const lunediIso = formattaDataIso(lunediCorrente);
  const domenicaIso = formattaDataIso(domenicaCorrente);

  const [
    nomeSettore,
    sponsorAttivi,
    partiteSettimanaRaw,
    gruppiStagione,
    fotoPerGruppo,
    urlPaginaFacebook,
  ] = await Promise.all([
    // Story 18.8: leggiInfoLogo (usata per <img> del logo) spostata in
    // HeaderPubblico.tsx, non piu' letta qui - questa pagina resta con la
    // propria lettura di nomeSettore perche' la usa anche per il proprio
    // <h1> (HeaderPubblico e FooterPubblico ora fanno la propria lettura
    // indipendente per il proprio uso, stessa logica duplicata di proposito
    // per restare componenti self-contained, vedi Dev Notes della storia).
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
    // Story 18.4 (AC #3): scoped alla sola stagione corrente (AD-8, stesso
    // filtro di /app/gruppi) - senza, un Gruppo di una stagione passata con
    // una foto mai ripulita da Storage comparirebbe ancora in home. "select"
    // esplicito, stesso principio delle query sopra.
    annoCorrente
      ? prisma.gruppo
          .findMany({
            where: { annoAgonisticoId: annoCorrente.id },
            orderBy: { nome: "asc" },
            select: { id: true, nome: true },
          })
          .catch((err) => {
            console.error(err);
            return [];
          })
      : Promise.resolve([]),
    // Story 18.4: UNA sola chiamata Storage per l'intero bucket, non N
    // chiamate per-Gruppo - vedi lib/storage/foto-squadra.ts.
    elencaGruppiConFoto(supabase).catch((err) => {
      console.error(err);
      return new Map<string, string | null>();
    }),
    // Story 18.5 (AC #5): fail-soft, stesso pattern delle altre query
    // pubbliche - un errore di lettura non deve rompere il resto della home.
    leggiUrlPaginaFacebook().catch((err) => {
      console.error(err);
      return null;
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

  // Story 18.4 (AC #3): "nessun placeholder per i Gruppi senza foto" - filtro
  // ai soli Gruppi presenti nella Map (elencaGruppiConFoto), non un elenco di
  // TUTTI i Gruppi della stagione con un'immagine mancante mostrata a vuoto.
  const gruppiConFoto = gruppiStagione
    .filter((g) => fotoPerGruppo.has(g.id))
    .map((g) => ({ ...g, aggiornatoIl: fotoPerGruppo.get(g.id) ?? null }));
  const mostraFotoSquadra = gruppiConFoto.length > 0;

  return (
    <>
      {/* Story 18.8: estratto in HeaderPubblico.tsx (secondo consumer
          reale, insieme a app/squadre/page.tsx). */}
      <HeaderPubblico />
      <main>
        <div className={styles.hero}>
          {/* Story 18.12 (AC #1/#5): foto placeholder e innesto diagonale -
              trattamento intenzionale finche' non esistono foto reali (vedi
              EXPERIENCE.md -> Fotografia Placeholder), non un segnaposto da
              wireframe. aria-hidden: puramente decorativi. */}
          <div className={styles.heroFoto} aria-hidden="true" />
          <div className={styles.heroDiagonale} aria-hidden="true" />
          <div className={styles.heroContenuto}>
            <h1>Benvenuti nel {nomeVisualizzato}</h1>
            {/* Story 18.5: ultimo residuo del paragrafo "in arrivo" rimosso -
                Sponsor/Partite/Foto squadra (Story 18.2/18.3/18.4) avevano già
                tolto la propria clausola, "gli ultimi post dai nostri canali
                social" era l'ultima rimasta. Nessun testo sensato restava dopo
                averla tolta, quindi l'intero paragrafo è stato rimosso invece
                di lasciarne uno vuoto o riscritto senza contenuto. */}
            {/* Story 18.12 (AC #4): CTA primario nuovo, richiesto
                letteralmente da EXPERIENCE.md -> Pattern dei Componenti
                ("Hero: Un solo CTA primario 'Scopri le squadre' -> /squadre") -
                nessun nuovo dato, solo un link verso una rotta già esistente. */}
            <Link href="/squadre" className={styles.heroCta}>
              Scopri le squadre
            </Link>
          </div>
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
        )}

        {/* Story 18.3 (AC #2): nessuna sezione se nessun Gruppo ha partite
            nella settimana corrente - stesso principio della sezione
            Sponsor sopra. */}
        {mostraPartite && (
          // Review fix: aria-labelledby invece di aria-label - a
          // differenza della sezione Sponsor sopra (due <h2>, nessuno dei
          // due riassume l'intera sezione), qui c'e' un solo <h2> che gia'
          // fa da nome accessibile: ripeterne il testo in aria-label lo
          // avrebbe solo duplicato.
          <section className={styles.sezionePartite} aria-labelledby="titolo-partite-settimana">
            <h2 id="titolo-partite-settimana" className={styles.titoloSezione}>
              Partite della settimana
            </h2>
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

        {/* Story 18.4 (AC #3): nessuna sezione se nessun Gruppo ha caricato
            una foto - stesso principio delle sezioni Sponsor/Partite sopra.
            aria-labelledby (non aria-label), stesso motivo della sezione
            Partite: un solo <h2> qui, nessun bisogno di ripeterne il testo. */}
        {mostraFotoSquadra && (
          <section
            className={styles.sezioneFotoSquadra}
            aria-labelledby="titolo-foto-squadra"
          >
            <h2 id="titolo-foto-squadra" className={styles.titoloSezione}>
              Foto di squadra
            </h2>
            <div className={styles.listaFotoSquadra}>
              {gruppiConFoto.map((gruppo) => (
                <div className={styles.schedaFotoSquadra} key={gruppo.id}>
                  <img
                    className={styles.immagineFotoSquadra}
                    src={`${urlPubblicoFotoSquadra(supabase, gruppo.id)}?v=${encodeURIComponent(gruppo.aggiornatoIl ?? "")}`}
                    alt={`Foto di squadra di ${gruppo.nome}`}
                  />
                  <span className={styles.nomeGruppoFoto}>{gruppo.nome}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Story 18.5 (AC #3/#4): nessuna sezione se non configurato O se il
            consenso ai cookie non essenziali non è stato dato - stesso
            messaggio visivo (sezione assente) per entrambi i casi, nessuna
            UI intermedia "accetta i cookie per vedere i post" (scelta di
            semplicità, nessun AC la richiede). Nessuno script/iframe di
            terze parti viene incluso nel markup quando questa condizione è
            falsa (Story 18.6 AC #5). Condizione scritta come
            "urlPaginaFacebook && consentitoSocial" (non una variabile
            mostraSocial separata) per il narrowing diretto di TypeScript su
            urlPaginaFacebook (string | null), senza un'asserzione non-null
            nel src dell'iframe sotto. */}
        {urlPaginaFacebook && consentitoSocial && (
          <section className={styles.sezioneSocial} aria-labelledby="titolo-social">
            <h2 id="titolo-social" className={styles.titoloSezione}>
              Ultimi post
            </h2>
            {/* Page Plugin ufficiale di Facebook - iframe, nessun token/API
                (lib/embed-facebook.ts). Stessi attributi già stabiliti per
                l'unico altro iframe del progetto (PalestraRow.tsx, Story
                9.6): loading lazy, title esplicito, referrerPolicy
                "no-referrer". Nessun onError/fallback: un problema di
                rendering lato Facebook resta contenuto nell'iframe stesso,
                non si propaga al resto della pagina (AC #5). */}
            <iframe
              className={styles.iframeSocial}
              src={costruisciLinkPaginaFacebookIncorporata(urlPaginaFacebook)}
              title="Ultimi post dalla nostra Pagina Facebook"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </section>
        )}
      </main>
      {/* Story 18.8: estratto in FooterPubblico.tsx - conSpazioCookieBanner
          perche' questa e' l'unica pagina che monta ancora <CookieBanner>
          (decisione gia' presa in Story 18.6, non riaperta), quindi ha
          bisogno del padding-bottom di sicurezza contro il pulsante fisso. */}
      <FooterPubblico conSpazioCookieBanner />
      {/* Story 18.6: sempre montato (non condizionato come
          mostraSponsor/mostraPartite sopra) - deve restare raggiungibile
          come pulsante "Preferenze cookie" anche dopo la scelta (AC #3),
          non solo alla prima visita. */}
      <CookieBanner valoreIniziale={valoreConsensoIniziale} />
    </>
  );
}

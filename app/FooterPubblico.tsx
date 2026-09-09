import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  leggiNomeSettore,
  leggiUrlPaginaFacebook,
  leggiUrlSitoPolisportiva,
} from "@/lib/configurazione-applicazione";
import {
  leggiInfoLogoPolisportiva,
  urlPubblicoLogoPolisportiva,
} from "@/lib/storage/logo-polisportiva";
import { urlPubblicoImmagineSponsor } from "@/lib/storage/sponsor";
import { BannerSponsorPubblico } from "./BannerSponsorPubblico";
import styles from "./FooterPubblico.module.css";

// Story 18.8: estratto da app/page.tsx, mirror del principio gia' spiegato
// in HeaderPubblico.tsx (estrazione al "secondo consumer reale").
// Self-contained: risolve la propria lettura di nomeSettore invece di
// riceverla come prop.
export async function FooterPubblico({
  conSpazioCookieBanner = false,
}: {
  // Story 18.6: il CookieBanner resta montato solo sulla home (decisione
  // gia' presa con l'utente in quella storia, non riaperta qui) - il
  // padding-bottom di sicurezza serve a non far sovrapporre il banner
  // fisso (CookieBanner.tsx, position:fixed in basso, visibile solo alla
  // prima scelta o quando riaperto dal link sotto) al copyright, quindi
  // serve solo li', non su ogni pagina che monta questo footer condiviso.
  conSpazioCookieBanner?: boolean;
}) {
  // Story 18.20: prima lettura Storage in questo componente (finora solo
  // Prisma diretto) - createClient() serve a leggiInfoLogoPolisportiva,
  // mirror del pattern gia' stabilito in HeaderPubblico.tsx (che lo ha gia'
  // per il logo del Settore). Risolto in parallelo, nessuna dipendenza
  // reciproca con le altre letture.
  const supabase = await createClient();

  // Story 18.12 (AC #4): riuso invariato di leggiUrlPaginaFacebook, gia'
  // esistente e gia' letta identica in app/page.tsx (Story 18.5) - nessuna
  // nuova Server Action/query, solo un secondo consumer della stessa
  // funzione per l'icona social del footer.
  const [
    nomeSettore,
    urlPaginaFacebook,
    logoPolisportiva,
    urlSitoPolisportiva,
    bannerSponsor,
  ] = await Promise.all([
    leggiNomeSettore().catch((err) => {
      console.error(err);
      return null;
    }),
    leggiUrlPaginaFacebook().catch((err) => {
      console.error(err);
      return null;
    }),
    // Story 18.20: stesso pattern fail-soft delle altre letture qui sopra.
    leggiInfoLogoPolisportiva(supabase).catch((err) => {
      console.error(err);
      return { esiste: false, aggiornatoIl: null as string | null };
    }),
    leggiUrlSitoPolisportiva().catch((err) => {
      console.error(err);
      return null;
    }),
    // Story 16.4: mirror esatto della query gia' in uso in app/app/page.tsx
    // (Story 16.3) per il carosello interno - solo Sponsor Banner attivi,
    // MAI Convenzioni (spec-16-4 Boundaries). Query separata e deliberata
    // da quella gia' esistente in app/page.tsx (che legge Banner+Convenzioni
    // per la griglia statica, Story 18.2): questo componente resta
    // self-contained e risolve la propria lettura, stesso principio gia'
    // documentato sopra per nomeSettore/logoPolisportiva ecc. Fail-soft
    // come le altre letture qui - un errore transitorio nasconde solo il
    // banner sponsor, non l'intero footer condiviso.
    // Review fix: "select" esplicito - stesso principio gia' applicato alla
    // query Sponsor di app/page.tsx (Story 18.2 review fix, Blind Hunter):
    // il confine "cosa e' sicuro esporre a un Visitatore anonimo" e'
    // imposto dalla query stessa, non solo dal mapping sotto - un futuro
    // campo interno aggiunto al model Sponsor non arriverebbe qui senza un
    // cambio esplicito a questo select.
    prisma.sponsor
      .findMany({
        where: { tipo: "BANNER", attiva: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, nome: true, linkEsterno: true, updatedAt: true },
      })
      .catch((err) => {
        console.error(err);
        return [];
      }),
  ]);
  const nomeVisualizzato = nomeSettore ?? "Settore Volley";

  // Story 16.4 (I/O matrix): stesso shape id/nome/linkEsterno/immagineUrl e
  // stesso cache-busting via updatedAt gia' in uso in app/app/page.tsx per
  // il carosello interno (Story 16.3).
  const bannerSponsorMappato = bannerSponsor.map((sponsor) => ({
    id: sponsor.id,
    nome: sponsor.nome,
    linkEsterno: sponsor.linkEsterno,
    immagineUrl: `${urlPubblicoImmagineSponsor(supabase, sponsor.id)}?v=${encodeURIComponent(sponsor.updatedAt.toISOString())}`,
  }));
  const mostraBannerSponsor = bannerSponsorMappato.length > 0;

  // Story 22.1: risolto una sola volta qui (stesso stile del resto della
  // funzione, ogni altra configurazione e' risolta in cima e poi riusata) -
  // .trim() perche' una svista di configurazione (spazi copiati per errore
  // dal dashboard Cloudflare) non deve produrre un token vuoto/malformato
  // inviato a ogni Visitatore; il fallback fail-soft "nessuno script" resta
  // corretto anche per un valore solo-spazi.
  const tokenAnalytics = process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN?.trim();

  // Story 16.4: le due classi di riserva spazio sono indipendenti e
  // combinabili (spec-16-4 Code Map) - sulla home possono applicarsi
  // entrambe insieme (CookieBanner + banner sponsor entrambi potenzialmente
  // presenti), sulle altre 6 pagine pubbliche (CookieBanner mai montato,
  // Story 18.6) solo eventualmente .footerConBannerSponsor.
  const classiFooter = [
    styles.footer,
    conSpazioCookieBanner ? styles.footerConCookieBanner : null,
    mostraBannerSponsor ? styles.footerConBannerSponsor : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // Frammento: il banner sponsor fisso (position:fixed a livello di
    // viewport, spec-16-4) e' un pari grado del <footer>, non un suo
    // discendente - annidarlo dentro il landmark <footer> esistente
    // duplicherebbe/confonderebbe la semantica dei due region distinti
    // (copyright/link vs. Sponsor in evidenza).
    <>
      <footer className={classiFooter}>
        <p>
          &copy; {new Date().getFullYear()} {nomeVisualizzato}
        </p>
        {/* Story 18.20: logo Polisportiva, dopo il copyright e prima
            dell'icona Facebook del Settore - stessa struttura condizionale
            di HeaderPubblico.tsx (link se l'URL e' impostato, altrimenti
            solo l'immagine). alt non vuoto, stesso motivo di HeaderPubblico.tsx. */}
        {logoPolisportiva.esiste &&
          (urlSitoPolisportiva ? (
            <a
              href={urlSitoPolisportiva}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.logoPolisportiva}
            >
              <img
                src={`${urlPubblicoLogoPolisportiva(supabase)}?v=${encodeURIComponent(logoPolisportiva.aggiornatoIl ?? "")}`}
                alt="Logo della Polisportiva"
              />
            </a>
          ) : (
            <img
              className={styles.logoPolisportiva}
              src={`${urlPubblicoLogoPolisportiva(supabase)}?v=${encodeURIComponent(logoPolisportiva.aggiornatoIl ?? "")}`}
              alt="Logo della Polisportiva"
            />
          ))}
        {/* Se non configurato, nessuna icona compare - fail-soft, stesso
            principio di ogni altro elemento condizionale pubblico (non
            un'area vuota "rotta", semplicemente non c'e' nulla da mostrare). */}
        {urlPaginaFacebook && (
          <a
            className={styles.iconaSocial}
            href={urlPaginaFacebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pagina Facebook della società"
          >
            F
          </a>
        )}
        {/* Story 18.17 (secondo giro): sostituisce il pulsante fisso
            permanente di CookieBanner.tsx, rimosso su richiesta dell'utente
            ("ancora troppo invasivo e visibile"). Presente su ogni pagina
            pubblica (questo componente e' condiviso) - naviga sempre verso
            "/" perche' CookieBanner resta montato solo li' (decisione di
            Story 18.6, non riaperta). Il diritto di revoca del consenso in
            qualunque momento (Linee guida Garante Privacy) resta comunque
            soddisfatto, solo il punto di accesso cambia.
            Review fix (code review, Blind Hunter): prefetch={false} - il
            link e' su ogni pagina pubblica, senza questo Next.js
            precaricherebbe l'intera home (incluse le letture Supabase e la
            chiamata all'API Graph di Facebook) al solo scorrimento del
            footer in vista, senza alcuna intenzione dell'utente. */}
        <Link
          href="/?preferenze-cookie=1"
          className={styles.linkPreferenzeCookie}
          prefetch={false}
        >
          Preferenze cookie
        </Link>
      </footer>
      {mostraBannerSponsor && (
        <BannerSponsorPubblico banner={bannerSponsorMappato} />
      )}
      {/* Story 22.1: Cloudflare Web Analytics - questo componente e' l'unico
          gia' montato da OGNI pagina pubblica e MAI dalle pagine autenticate
          /app/* (che hanno un proprio layout separato, app/app/layout.tsx) -
          nessun layout condiviso esiste per le sole pagine pubbliche, questo
          e' il punto piu' vicino a un simile layout. Token pubblico (non un
          segreto, pensato per essere incluso lato client) - fail-soft:
          nessuno script viene caricato se la variabile non e' impostata
          (locale/anteprima), nessun impatto sul sito. Cookie-less by design
          (nessun cookie impostato) - NON valutato se l'invio dell'IP del
          Visitatore a Cloudflare come processore terzo richieda comunque una
          menzione nell'informativa privacy, questione distinta dal solo
          banner cookie (Story 18.6/18.17) e non ancora decisa con l'utente. */}
      {tokenAnalytics && (
        <Script
          id="cf-web-analytics"
          strategy="afterInteractive"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: tokenAnalytics })}
        />
      )}
    </>
  );
}

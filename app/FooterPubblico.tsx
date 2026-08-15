import Link from "next/link";
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
  const [nomeSettore, urlPaginaFacebook, logoPolisportiva, urlSitoPolisportiva] =
    await Promise.all([
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
    ]);
  const nomeVisualizzato = nomeSettore ?? "Settore Volley";

  return (
    <footer
      className={
        conSpazioCookieBanner
          ? `${styles.footer} ${styles.footerConCookieBanner}`
          : styles.footer
      }
    >
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
  );
}

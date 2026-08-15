import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import {
  leggiInfoLogoPolisportiva,
  urlPubblicoLogoPolisportiva,
} from "@/lib/storage/logo-polisportiva";
import {
  leggiNomeSettore,
  leggiUrlSitoPolisportiva,
} from "@/lib/configurazione-applicazione";
import { NavPubblica } from "./NavPubblica";
import styles from "./HeaderPubblico.module.css";

// Story 18.8: estratto da app/page.tsx - seconda pagina pubblica reale
// (dopo la home, Story 18.1-18.7) e' il punto in cui questo progetto estrae
// sempre un componente condiviso al "secondo consumer reale" (stesso
// principio gia' seguito per app/icone-azione-riga.tsx, Story 9.30) invece
// di duplicare. Self-contained (nessun prop obbligatorio): risolve le
// proprie letture (logo/nome settore) invece di riceverle dalla pagina che
// lo monta, cosi' resta riusabile identico da ogni futura pagina pubblica
// (Story 18.9-18.11) senza dover far transitare quei dati come prop.
export async function HeaderPubblico() {
  // Nessuna sessione qui (pagina pubblica): createClient() funziona
  // comunque (usa la sola anon key) - stesso principio gia' stabilito in
  // app/page.tsx (Story 18.1).
  const supabase = await createClient();

  const [info, nomeSettore, logoPolisportiva, urlSitoPolisportiva] = await Promise.all([
    leggiInfoLogo(supabase).catch((err) => {
      console.error(err);
      return { esiste: false, aggiornatoIl: null as string | null };
    }),
    leggiNomeSettore().catch((err) => {
      console.error(err);
      return null;
    }),
    // Story 18.20: stesso pattern fail-soft di leggiInfoLogo sopra.
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
      {/* Story 18.7 (AC #1): menu tra brand e Accedi - Accedi resta un
          elemento separato (Story 18.1 AC #7), non una sesta voce. */}
      <NavPubblica />
      {/* Story 18.20: logo Polisportiva dopo il menu, prima di "Accedi" -
          posizione letterale richiesta dall'utente. alt non vuoto (a
          differenza del logo Settore sopra, alt="", decorativo perche' il
          nome e' gia' scritto in testo accanto): qui non c'e' un'etichetta
          testuale equivalente, l'immagine stessa veicola l'informazione. */}
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
      <Link href="/accedi" className={styles.accedi}>
        Accedi
      </Link>
    </header>
  );
}

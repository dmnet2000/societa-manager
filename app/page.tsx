import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import styles from "./home-pubblica.module.css";

// Story 18.1 (Epic 18): nuova home pubblica su "/" (senza autenticazione),
// sostituisce la dashboard interna spostata su /app - vedi app/app/page.tsx.
// Solo layout/scheletro in questa story (AC #7): nessuna sezione di
// contenuto (sponsor/partite/foto squadra/social arrivano con le Story
// 18.2-18.5). Logo/nome del settore possono cambiare in qualunque momento
// dalla console Admin (/app/logo) - stesso motivo di dynamic =
// "force-dynamic" gia' in uso su /accedi.
export const dynamic = "force-dynamic";

export default async function HomePubblicaPage() {
  // Nessuna sessione qui (pagina pubblica): createClient() funziona
  // comunque (usa la sola anon key). Stesso pattern di app/(auth)/accedi/page.tsx
  // - due try/catch separati (logo/nome settore, entrambi puramente
  // decorativi) cosi' un errore transitorio su uno non nasconde anche
  // l'altro.
  const supabase = await createClient();

  let info = { esiste: false, aggiornatoIl: null as string | null };
  try {
    info = await leggiInfoLogo(supabase);
  } catch (err) {
    console.error(err);
  }

  let nomeSettore: string | null = null;
  try {
    nomeSettore = await leggiNomeSettore();
  } catch (err) {
    console.error(err);
  }

  const nomeVisualizzato = nomeSettore ?? "Settore Volley";

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
      <main className={styles.hero}>
        <h1>Benvenuti nel {nomeVisualizzato}</h1>
        <p className={styles.sottotitolo}>
          Il sito pubblico del nostro settore volley è in costruzione: presto
          qui troverai le partite della settimana, i nostri sponsor, le foto
          delle squadre e gli ultimi post dai nostri canali social.
        </p>
      </main>
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {nomeVisualizzato}
        </p>
      </footer>
    </>
  );
}

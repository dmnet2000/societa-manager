import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { LogoForm } from "./LogoForm";
import { NomeSettoreForm } from "./NomeSettoreForm";
import styles from "./logo.module.css";

// Dati potenzialmente diversi ad ogni visita (Admin che ha appena
// caricato), stesso motivo di /smtp, /notifiche.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/logo" - il route group "(configurazione)" non compare nell'URL,
// stesso motivo del fix di Story 7.1) e' gia' il cancello.
export default async function LogoPage() {
  // Story 17.2 (review fix): ruoli e supabase non dipendono l'uno
  // dall'altro - eseguiti in Promise.all, stesso principio gia' stabilito
  // altrove nel progetto (info/nomeSettoreAttuale restano nel secondo
  // Promise.all: dipendono dal client supabase gia' risolto).
  const [ruoli, supabase] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    createClient(),
  ]);
  const [info, nomeSettoreAttuale] = await Promise.all([
    leggiInfoLogo(supabase),
    leggiNomeSettore(),
  ]);

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Configurazione logo"
          contenuto={contenutoPerRotta("/app/logo", ruoli)}
        />
        {info.esiste ? (
          // AC #2: URL pubblico, nessuna autenticazione richiesta per
          // caricare l'immagine - a differenza degli URL firmati dei
          // certificati medici (AD-6), qui e' esattamente il comportamento
          // voluto. Review fix: query string di cache-busting (?v=data di
          // aggiornamento) - urlPubblicoLogo() e' deterministico (sempre lo
          // stesso URL per il path fisso "logo"), quindi senza di essa il
          // browser potrebbe continuare a mostrare la versione precedente
          // dopo una sostituzione (revalidatePath invalida solo la cache RSC
          // di Next.js, non le richieste dirette verso Supabase Storage).
          <img
            src={`${urlPubblicoLogo(supabase)}?v=${encodeURIComponent(info.aggiornatoIl ?? "")}`}
            alt="Logo attuale"
            className={styles.anteprimaLogo}
          />
        ) : (
          <p className={styles.messaggioVuoto}>Nessun logo impostato.</p>
        )}
        <LogoForm />
        <h2 className={styles.titoloSezione}>Nome del settore</h2>
        <NomeSettoreForm nomeSettoreAttuale={nomeSettoreAttuale} />
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import { AccediForm } from "./AccediForm";
import styles from "./accedi.module.css";

// Logo/nome del settore possono cambiare in qualunque momento dalla console
// Admin (/logo) - stesso motivo di dynamic = "force-dynamic" in quella
// pagina.
export const dynamic = "force-dynamic";

export default async function AccediPage() {
  // Nessuna sessione qui (pagina di login): createClient() funziona comunque
  // (usa la sola anon key) - leggiInfoLogo() legge il bucket pubblico
  // "logo-applicazione" (policy SELECT pubblica, vedi migrazione
  // 20260725020000_logo_bucket_public_select_policy), leggiNomeSettore()
  // passa da Prisma diretto (mai RLS, vedi lib/configurazione-applicazione.ts).
  // Entrambi puramente decorativi e indipendenti tra loro: un try/catch
  // separato per ciascuno evita che un errore transitorio su uno nasconda
  // anche l'altro (a differenza di un unico Promise.all) - stesso principio
  // del doppio try/catch (utente/logo) in app/NavBar.tsx.
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

  return (
    <main className={styles.pagina}>
      <div className={styles.riquadro}>
        {(info.esiste || nomeSettore) && (
          <div className={styles.intestazione}>
            {info.esiste && (
              <img
                className={styles.logo}
                src={`${urlPubblicoLogo(supabase)}?v=${encodeURIComponent(info.aggiornatoIl ?? "")}`}
                alt=""
              />
            )}
            {nomeSettore && <p className={styles.nomeSettore}>{nomeSettore}</p>}
          </div>
        )}
        <h1>Accedi</h1>
        <AccediForm />
      </div>
    </main>
  );
}

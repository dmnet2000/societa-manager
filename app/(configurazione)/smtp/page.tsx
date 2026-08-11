import { createClient } from "@/lib/supabase/server";
import {
  leggiConfigurazioneSmtp,
  rimuoviPassword,
} from "@/lib/db-rls/configurazione-smtp";
import { contenutoPerRotta } from "@/lib/guida/contenuti";
import { risolviRuoliPerAiutoContestuale } from "@/lib/guida/risolvi-ruoli-pagina";
import { TitoloPagina } from "@/app/AiutoContestuale";
import { ConfigurazioneSmtpForm } from "./ConfigurazioneSmtpForm";
import { InviaEmailProvaForm } from "./InviaEmailProvaForm";
import styles from "./smtp.module.css";

// Dati potenzialmente diversi ad ogni visita (Admin che ha appena salvato),
// stesso motivo di /certificato-medico, /notifiche.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/smtp" - il route group "(configurazione)" non compare nell'URL,
// stesso pattern di ogni altro route group di questo progetto) e' gia' il
// cancello.
export default async function ConfigurazioneSmtpPage() {
  // Story 17.2 (review fix): ruoli e la catena supabase->configurazione non
  // dipendono l'uno dall'altro - eseguiti in Promise.all, stesso principio
  // gia' stabilito altrove nel progetto (la catena interna resta
  // sequenziale: leggiConfigurazioneSmtp ha bisogno del client risolto).
  const [ruoli, configurazione] = await Promise.all([
    risolviRuoliPerAiutoContestuale(),
    createClient().then((supabase) => leggiConfigurazioneSmtp(supabase)),
  ]);
  // Review fix: mai passare la password in chiaro a un Client Component
  // (rimuoviPassword, lib/db-rls/configurazione-smtp.ts) - Next.js
  // serializza ogni prop nel payload RSC inviato al browser.
  const configurazionePubblica = configurazione
    ? rimuoviPassword(configurazione)
    : null;

  return (
    <main className="pagina-form">
      <div className="riquadro-form">
        <TitoloPagina
          titolo="Configurazione SMTP"
          contenuto={contenutoPerRotta("/smtp", ruoli)}
        />
        {!configurazione && (
          <p className={styles.messaggioVuoto}>
            Nessuna configurazione email impostata.
          </p>
        )}
        <ConfigurazioneSmtpForm configurazioneEsistente={configurazionePubblica} />
        {configurazione && <InviaEmailProvaForm />}
      </div>
    </main>
  );
}

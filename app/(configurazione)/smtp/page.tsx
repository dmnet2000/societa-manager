import { createClient } from "@/lib/supabase/server";
import {
  leggiConfigurazioneSmtp,
  rimuoviPassword,
} from "@/lib/db-rls/configurazione-smtp";
import { ConfigurazioneSmtpForm } from "./ConfigurazioneSmtpForm";
import { InviaEmailProvaForm } from "./InviaEmailProvaForm";

// Dati potenzialmente diversi ad ogni visita (Admin che ha appena salvato),
// stesso motivo di /certificato-medico, /notifiche.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/smtp" - il route group "(configurazione)" non compare nell'URL,
// stesso pattern di ogni altro route group di questo progetto) e' gia' il
// cancello.
export default async function ConfigurazioneSmtpPage() {
  const supabase = await createClient();
  const configurazione = await leggiConfigurazioneSmtp(supabase);
  // Review fix: mai passare la password in chiaro a un Client Component
  // (rimuoviPassword, lib/db-rls/configurazione-smtp.ts) - Next.js
  // serializza ogni prop nel payload RSC inviato al browser.
  const configurazionePubblica = configurazione
    ? rimuoviPassword(configurazione)
    : null;

  return (
    <main>
      <h1>Configurazione SMTP</h1>
      {!configurazione && <p>Nessuna configurazione email impostata.</p>}
      <ConfigurazioneSmtpForm configurazioneEsistente={configurazionePubblica} />
      {configurazione && <InviaEmailProvaForm />}
    </main>
  );
}

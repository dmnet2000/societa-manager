import { createClient } from "@/lib/supabase/server";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { LogoForm } from "./LogoForm";

// Dati potenzialmente diversi ad ogni visita (Admin che ha appena
// caricato), stesso motivo di /smtp, /notifiche.
export const dynamic = "force-dynamic";

// Nessun controllo di Ruolo qui: la route-guard (lib/auth/route-guard.ts,
// prefix "/logo" - il route group "(configurazione)" non compare nell'URL,
// stesso motivo del fix di Story 7.1) e' gia' il cancello.
export default async function LogoPage() {
  const supabase = await createClient();
  const info = await leggiInfoLogo(supabase);

  return (
    <main>
      <h1>Configurazione logo</h1>
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
        />
      ) : (
        <p>Nessun logo impostato.</p>
      )}
      <LogoForm />
    </main>
  );
}

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { parseRuoli } from "@/lib/ruoli";
import { NON_AUTORIZZATO_PATH } from "@/lib/auth/route-guard";
import { filtraVociNavigazione } from "@/lib/auth/voci-navigazione";
import { leggiInfoLogo, urlPubblicoLogo } from "@/lib/storage/logo";
import { esci } from "./NavBar.actions";
import { NavBarClient } from "./NavBarClient";

// Story 8.1: componente cross-cutting condiviso (non di un singolo modulo/
// route-group) - montato una sola volta nel root layout, ereditato da ogni
// pagina automaticamente. Server Component: legge sessione/Ruoli/logo
// direttamente, nessuna direttiva "use client" necessaria (nessuna
// interattivita' oltre i link nativi).
export async function NavBar() {
  const supabase = await createClient();

  // Review fix: fail-closed, stesso pattern di proxy.ts (identica chiamata,
  // gia' commentato li' come "fail-closed... trattato come utente non
  // autenticato, non come crash"). Senza questo try/catch, un errore di rete
  // verso Supabase Auth farebbe fallire il rendering dell'intero root
  // layout - ogni pagina dell'app, non solo la barra - dato che NavBar e'
  // montato li' sopra {children}.
  let user = null;
  try {
    const {
      data: { user: utenteAutenticato },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
    }
    user = utenteAutenticato;
  } catch (err) {
    console.error(err);
  }

  // AC #4: nessuna sessione -> nessuna barra (copre /accedi e /registrati
  // senza bisogno di conoscere il pathname).
  if (!user) {
    return null;
  }

  // AC #4: /non-autorizzato e' raggiunta da un Utente GIA' autenticato (con
  // un Ruolo, solo non quello richiesto dalla pagina appena rifiutata) - la
  // sola condizione "nessun user" non la nasconderebbe li'. Il pathname non
  // e' altrimenti disponibile in un Server Component della root layout
  // senza attraversare il bordo client/server solo per questo scopo -
  // esposto dal Proxy (proxy.ts) via header di risposta.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === NON_AUTORIZZATO_PATH) {
    return null;
  }

  const ruoli = parseRuoli(user.app_metadata?.ruoli);
  const voci = filtraVociNavigazione(ruoli);

  // Review fix: il logo e' puramente decorativo - un errore transitorio di
  // Supabase Storage non deve far fallire il rendering di ogni pagina
  // dell'app (rischio nuovo introdotto montando questa lettura nel root
  // layout invece che solo dentro /logo/page.tsx, dove un fallimento
  // restava isolato a quella pagina).
  let info = { esiste: false, aggiornatoIl: null as string | null };
  try {
    info = await leggiInfoLogo(supabase);
  } catch (err) {
    console.error(err);
  }

  const vociConStato = voci.map((voce) => ({
    ...voce,
    attiva: pathname === voce.href || pathname.startsWith(`${voce.href}/`),
  }));

  const logoUrl = info.esiste
    ? `${urlPubblicoLogo(supabase)}?v=${encodeURIComponent(info.aggiornatoIl ?? "")}`
    : null;

  return (
    <NavBarClient
      voci={vociConStato}
      logoUrl={logoUrl}
      titolo="Società Manager"
      esci={esci}
      // Story 9.4: trigger del menu profilo = email dell'Utente (nessuna
      // nuova icona, vedi spec) - fallback solo teorico ("Account"), un
      // Utente Supabase Auth autenticato ha sempre un'email in questo
      // progetto (unico metodo di signUp/signIn usato). Review fix (code
      // review Story 9.4, Edge Case Hunter): "||" invece di "??" copre anche
      // una stringa vuota (non solo null/undefined), stesso fallback.
      email={user.email || "Account"}
    />
  );
}
